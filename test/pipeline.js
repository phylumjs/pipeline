'use strict'

const test = require('ava')
const {Pipeline} = require('..')

test('api assertions', t => {
	t.throws(() => new Pipeline('foo'))
	t.throws(() => new Pipeline(() => {}, 'bar'))
})

test('get context', async t => {
	let fooCtx, barCtx
	async function bar(ctx) {
		barCtx = ctx
	}
	async function foo(ctx) {
		fooCtx = ctx
		await ctx.use(bar)
	}
	const pipeline = new Pipeline(foo)
	await pipeline.enable()
	t.is(pipeline.getContext(foo), fooCtx)
	t.is(pipeline.getContext(bar), barCtx)
	t.is(pipeline.getContext(fooCtx), fooCtx)
	t.is(pipeline.getContext(null), null)
	t.throws(() => pipeline.getContext(undefined))
	t.throws(() => pipeline.getContext(42))
})

test('disable', async t => {
	t.plan(3)
	const pipeline = new Pipeline(async ctx => {
		t.pass()
		setImmediate(() => ctx.dispose())
	})
	await pipeline.enable()
	t.true(pipeline.isEnabled)
	pipeline.disable()
	t.false(pipeline.isEnabled)
	pipeline.disable()
})

test('disable (then dispose entry)', async t => {
	let lastCtx
	const pipeline = new Pipeline(async ctx => {
		t.is(lastCtx, undefined)
		lastCtx = ctx
		ctx.on('dispose', () => {
			pipeline.disable()
		})
	})
	await pipeline.enable()
	lastCtx.dispose()
	await new Promise(setImmediate)
})

test('disable (await disposals)', async t => {
	let disposalResolved = false
	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', () => new Promise(resolve => setImmediate(() => {
			disposalResolved = true
			resolve()
		})))
	})
	await pipeline.enable()
	t.false(disposalResolved)
	await pipeline.disable()
	t.true(disposalResolved)
})

test('dispose error', async t => {
	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', async () => {
			throw 'foo'
		})
	})
	await pipeline.enable()
	pipeline.on('dispose-error', err => {
		t.is(err, 'foo')
	})
	await pipeline.disable()
})

test('destroy unused', async t => {
	let state = 0
	let fooDisposed = false
	async function foo(ctx) {
		ctx.on('dispose', () => {
			fooDisposed = true
			t.is(state, 2)
		})
	}
	const pipeline = new Pipeline(async ctx => {
		if (state === 0) {
			await ctx.use(foo)
			setImmediate(() => ctx.dispose())
		} else if (state === 1) {
			t.false(fooDisposed)
		} else {
			t.fail()
		}
		state++
	})
	pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('resolve', () => {
			if (state === 2) {
				t.true(fooDisposed)
				resolve()
			}
		})
	})
})

test('destroy unused manually', async t => {
	let state = 0
	let fooDisposed = false
	async function foo(ctx) {
		t.false(fooDisposed)
		ctx.on('dispose', () => {
			fooDisposed = true
		})
	}
	const pipeline = new Pipeline(async ctx => {
		if (state === 0) {
			await ctx.use(foo)
			setImmediate(() => {
				ctx.dispose()
			})
		} else if (state === 1) {
			setImmediate(() => ctx.dispose())
			ctx.push(Promise.reject('foo'))
		} else {
			setImmediate(() => ctx.dispose())
		}
		state++
	}, {
		autoDisposeUnused: false
	})
	pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('resolve', res => {
			if (state === 4) {
				resolve()
			}
		})
	})
	t.false(fooDisposed)
	await pipeline.disposeUnused()
	t.true(fooDisposed)
})

test('expose entry context in event: "resolve"', async t => {
	let sourceCtx
	const pipeline = new Pipeline(async ctx => {
		sourceCtx = ctx
	})
	await new Promise(resolve => {
		pipeline.on('resolve', (_, ctx) => {
			t.is(ctx, sourceCtx)
			resolve()
		})
		pipeline.enable()
	})
})

test('expose entry context in event: "reject"', async t => {
	let sourceCtx
	const pipeline = new Pipeline(async ctx => {
		sourceCtx = ctx
		throw new Error('foo')
	})
	await new Promise(resolve => {
		pipeline.on('reject', (_, ctx) => {
			t.is(ctx, sourceCtx)
			resolve()
		})
		pipeline.enable()
	})
})

test('expose causing context in event: "dispose-error"', async t => {
	let sourceCtx
	const pipeline = new Pipeline(async ctx => {
		sourceCtx = ctx
		ctx.on('dispose', async () => {
			throw new Error('foo')
		})
	})
	await pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('dispose-error', (err, ctx) => {
			t.is(ctx, sourceCtx)
			resolve()
		})
		pipeline.disable()
	})
})

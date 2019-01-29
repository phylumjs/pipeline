'use strict'

const test = require('ava')
const {Pipeline} = require('..')

test('push, dispose', async t => {
	let entryCalled = 0
	let entryDisposed = 0
	async function foo(ctx) {
		setImmediate(() => ctx.push(true))
		return false
	}
	const pipeline = new Pipeline(async ctx => {
		t.false(ctx.isDisposed)
		ctx.on('dispose', () => {
			t.true(ctx.isDisposed)
			entryDisposed++
		})
		entryCalled++
		return ctx.use(foo)
	})
	pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('resolve', done => {
			if (done) {
				resolve()
			}
		})
	})
	t.is(entryDisposed, 1)
	t.is(entryCalled, 2)
})

test('push, pull', async t => {
	let pulled = 0
	async function foo(ctx) {
		setImmediate(() => ctx.push(true))
		return false
	}
	const pipeline = new Pipeline(async ctx => {
		t.false(ctx.isPulling(foo))
		ctx.pull(foo, state => {
			pulled++
			ctx.push(state)
		})
		t.true(ctx.isPulling(foo))
		t.is(pulled, 0)
		return ctx.use(foo)
	})
	pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('resolve', done => {
			if (done) {
				resolve()
			}
		})
	})
	t.is(pulled, 1)
})

test('push, pullImmediate', async t => {
	t.plan(3)
	let pulled = 0
	async function foo(ctx) {
		setImmediate(() => ctx.push(2))
		return 1
	}
	const pipeline = new Pipeline(async ctx => {
		ctx.pullImmediate(foo, state => {
			pulled++
			ctx.push(state)
		})
		return 0
	})
	pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('resolve', value => {
			if (value === 0) {
				t.is(pulled, 0)
			} else if (value === 1) {
				t.is(pulled, 1)
			} else if (value === 2) {
				t.is(pulled, 2)
				resolve()
			}
		})
	})
})

test('pull context', async t => {
	let fooCtx
	async function foo(ctx) {
		fooCtx = ctx
	}
	await new Pipeline(async ctx => {
		await ctx.use(foo)
		t.false(ctx.isPulling(foo))
		t.false(ctx.isPulling(fooCtx))
		t.true(ctx.pull(fooCtx, () => {}))
		t.true(ctx.isPulling(foo))
		t.true(ctx.isPulling(fooCtx))
	}).enable()
})

test('pullImmediate context', async t => {
	let fooCtx
	async function foo(ctx) {
		fooCtx = ctx
	}
	await new Pipeline(async ctx => {
		await ctx.use(foo)
		t.true(ctx.pullImmediate(fooCtx, () => {}))
	}).enable()
})

test('pull (api assertions)', async t => {
	async function foo() {}
	function throws(cb) {
		return t.throwsAsync(new Pipeline(async ctx => {
			return cb(ctx)
		}).enable())
	}
	await throws(ctx => {
		t.true(ctx.pullImmediate(foo, () => {}))
		ctx.pull(foo, () => {})
	})
	await throws(ctx => {
		t.true(ctx.pull(foo, () => {}))
		ctx.pullImmediate(foo, () => {})
	})
	await throws(ctx => ctx.pull(foo, 'bar'))
	await throws(ctx => ctx.pullImmediate(foo, 'bar'))
	await throws(ctx => ctx.pull('foo', foo))
	await throws(ctx => ctx.pullImmediate('foo', foo))
	await throws(ctx => ctx.isPulling('foo'))
})

test('pull (from disposed context)', async t => {
	async function foo() {}
	await new Pipeline(async ctx => {
		ctx.dispose(true)
		t.false(ctx.pull(foo, () => {}))
		t.false(ctx.pullImmediate(foo, () => {}))
	}).enable()
})

test('expose dependency context in update handler', async t => {
	let fooCtx
	async function foo(ctx) {
		fooCtx = ctx
		ctx.push('bar')
		return 'foo'
	}
	const pipeline = new Pipeline(async ctx => {
		await new Promise((resolve, reject) => {
			ctx.pull(foo, (state, ctx) => {
				state.then(value => {
					t.is(value, 'bar')
					t.is(ctx, fooCtx)
					resolve()
				}, reject)
			})
			ctx.use(foo).then(value => {
				t.is(value, 'foo')
			}, reject)
		})
	})
	await pipeline.enable()
})

test('expose dependency context in immediate update handler', async t => {
	let fooCtx
	async function foo(ctx) {
		fooCtx = ctx
	}
	const pipeline = new Pipeline(async ctx => {
		await new Promise(resolve => {
			ctx.pullImmediate(foo, (_, ctx) => {
				t.is(ctx, fooCtx)
				resolve()
			})
		})
	})
	await pipeline.enable()
})
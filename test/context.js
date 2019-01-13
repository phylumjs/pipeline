'use strict'

const test = require('ava')
const Pipeline = require('..')

test('exports', async t => {
	await new Pipeline(async ctx => {
		t.true(ctx.exports && typeof ctx.exports === 'object')
	}).enable()
})

test('sync handlers', async t => {
	t.is(await new Pipeline(ctx => {
		return 'foo'
	}).enable(), 'foo')
	await t.throwsAsync(new Pipeline(ctx => {
		throw new Error('foo')
	}).enable(), 'foo')
	t.is(await new Pipeline(async ctx => {
		return ctx.use(() => 'foo')
	}).enable(), 'foo')
	await t.throwsAsync(new Pipeline(async ctx => {
		await ctx.use(() => {
			throw new Error('foo')
		})
	}).enable(), 'foo')
})

test('dispose', async t => {
	t.plan(2)
	let disposed = false
	async function foo(ctx) {
		if (!disposed) {
			disposed = true
			ctx.dispose()
			return false
		}
		return true
	}
	const pipeline = new Pipeline(async ctx => {
		return ctx.use(foo)
	})
	pipeline.enable()
	await new Promise(resolve => {
		pipeline.on('resolve', done => {
			t.pass()
			if (done) {
				resolve()
			}
		})
	})
})

test('dispose only once', async t => {
	t.plan(1)
	let disposed = false
	await new Pipeline(async ctx => {
		if (!disposed) {
			disposed = true
			ctx.on('dispose', () => {
				t.pass()
			})
			ctx.dispose()
			ctx.dispose()
		}
	}).enable()
})

test('dispose silent', async t => {
	let disposed = false
	async function foo(ctx) {
		if (disposed) {
			t.fail('Silently disposed task was called twice.')
		} else {
			disposed = true
			ctx.dispose(true)
		}
	}
	const pipeline = new Pipeline(async ctx => {
		const disposedBefore = disposed
		await ctx.use(foo)
		return disposedBefore
	})
	t.false(await pipeline.enable())
	await new Promise(setImmediate)
	t.false(await pipeline.enable())
})

test('dispose async', async t => {
	let disposed = 0
	let isReady = true
	async function foo(ctx) {
		setImmediate(() => ctx.push(true))
		return false
	}
	const pipeline = new Pipeline(async ctx => {
		t.true(isReady)
		ctx.on('dispose', () => {
			isReady = false
			disposed++
			return new Promise(resolve => {
				setTimeout(() => {
					isReady = true
					resolve()
				}, 50)
			})
		})
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
	t.is(disposed, 1)
	t.true(isReady)
})

test('dispose async (multiple listeners)', async t => {
	let resolved = 0
	const pipeline = new Pipeline(async ctx => {
		let duplicate
		function getDuplicate() {
			if (!duplicate) {
				duplicate = new Promise(resolve => setImmediate(() => {
					resolved++
					resolve()
				}))
			}
			return duplicate
		}
		ctx.on('dispose', getDuplicate)
		ctx.on('dispose', getDuplicate)
		ctx.on('dispose', () => new Promise(resolve => setImmediate(() => {
			resolved++
			resolve()
		})))
	})
	await pipeline.enable()
	await pipeline.disable()
	t.is(resolved, 2)
})

test('dispose after pipeline', async t => {
	let disposed
	async function foo(ctx) {
		disposed = false
		ctx.disposeAfterPipeline = true
		t.true(ctx.disposeAfterPipeline)
		ctx.on('dispose', () => {
			disposed = true
		})
	}
	const pipeline = new Pipeline(async ctx => {
		await ctx.use(foo)
		t.false(disposed)
	})
	await pipeline.enable()
	t.true(disposed)
})

test('dispose after pipeline (cancel)', async t => {
	let disposed
	async function foo(ctx) {
		disposed = false
		ctx.disposeAfterPipeline = true
		t.true(ctx.disposeAfterPipeline)
		ctx.disposeAfterPipeline = false
		t.false(ctx.disposeAfterPipeline)
		ctx.on('dispose', () => {
			disposed = true
		})
	}
	const pipeline = new Pipeline(async ctx => {
		await ctx.use(foo)
		t.false(disposed)
	})
	await pipeline.enable()
	t.false(disposed)
})

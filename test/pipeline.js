'use strict'

const test = require('ava')
const Pipeline = require('..')

test('use', async t => {
	async function foo(ctx) {
		return 'bar'
	}
	const pipeline = new Pipeline(async ctx => {
		t.is(await ctx.use(foo), 'bar')
		return 'foo'
	})
	t.is(await pipeline.enable(), 'foo')
})

test('push, dispose', async t => {
	let entryCalled = 0
	let entryDisposed = 0
	async function foo(ctx) {
		setImmediate(() => ctx.push(true))
		return false
	}
	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', () => {
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
		ctx.pull(foo, state => {
			pulled++
			ctx.push(state)
		})
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

test('dispose', async t => {
	t.plan(2)
	let disposed = false
	const pipeline = new Pipeline(async ctx => {
		if (!disposed) {
			disposed = true
			ctx.dispose()
			return false
		}
		return true
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

test('await context disposals', async t => {
	let disposed = 0
	let isReady = true
	async function foo(ctx) {
		setImmediate(() => ctx.push(true))
		return false
	}
	const pipeline = new Pipeline(async ctx => {
		t.true(isReady)
		ctx.on('dispose', add => {
			isReady = false
			disposed++
			add(new Promise(resolve => {
				setTimeout(() => {
					isReady = true
					resolve()
				}, 50)
			}))
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

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

test('use (from disposed context)', async t => {
	async function foo() {}
	await t.throwsAsync(new Pipeline(async ctx => {
		ctx.dispose(true)
		ctx.use(foo)
	}).enable())
})

test('use (api assertions)', async t => {
	await t.throwsAsync(new Pipeline(async ctx => {
		ctx.use('foo')
	}).enable())
})

test('use context', async t => {
	let fooCtx
	async function foo(ctx) {
		fooCtx = ctx
		return 'bar'
	}
	await new Pipeline(async ctx => {
		await ctx.use(foo)
		t.is(await ctx.use(fooCtx), 'bar')
	}).enable()
})

test('drop', async t => {
	let resolvePushed
	let pushed = new Promise(resolve => {
		resolvePushed = resolve
	})
	async function foo(ctx) {
		setImmediate(() => {
			ctx.push('foo')
			resolvePushed()
		})
	}
	const pipeline = new Pipeline(async ctx => {
		await ctx.use(foo)
		await ctx.pull(foo, () => {
			t.fail('Got update from dropped dependency.')
		})
		t.true(ctx.isPulling(foo))
		ctx.drop(foo)
		t.false(ctx.isPulling(foo))
	})
	await pipeline.enable()
	await pushed
})

test('drop non dependency', async t => {
	async function foo() {}
	await new Pipeline(async ctx => {
		ctx.drop(foo)
		t.false(ctx.isDependency(foo))
	}).enable()
})

test('drop context', async t => {
	let fooCtx
	async function foo(ctx) {
		fooCtx = ctx
	}
	await new Pipeline(async ctx => {
		await ctx.use(foo)
		ctx.drop(fooCtx)
		t.false(ctx.isDependency(foo))
	}).enable()
})

test('drop (api assertions)', async t => {
	await new Pipeline(async ctx => {
		t.throws(() => ctx.drop(42))
	}).enable()
})

test('dependency api', async t => {
	let fooCtx, barCtx
	async function foo(ctx) {
		fooCtx = ctx
		t.true(ctx.isDependent(bar))
		t.true(ctx.isDependent(barCtx))
		t.false(ctx.isDependent(null))
	}
	async function bar(ctx) {
		barCtx = ctx
		t.false(ctx.isDependency(foo))
		await ctx.use(foo)
		t.true(ctx.isDependency(foo))
		t.true(ctx.isDependency(fooCtx))
	}
	await new Pipeline(bar).enable()
})

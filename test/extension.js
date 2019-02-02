'use strict'

const test = require('ava')
const {Pipeline, Context} = require('..')

class CustomPipeline extends Pipeline {
	createContext(fn) {
		return new CustomContext(this, fn)
	}

	get foo() {
		return 'bar'
	}
}

class CustomContext extends Context {
	get bar() {
		return 'foo'
	}
}

test('pipeline and context', async t => {
	const pipeline = new CustomPipeline(async ctx => {
		t.true(ctx instanceof CustomContext)
		t.is(ctx.pipeline.foo, 'bar')
		t.is(ctx.bar, 'foo')
	})
	t.is(pipeline.foo, 'bar')
	await pipeline.enable()
})

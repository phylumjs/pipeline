'use strict'

const test = require('ava')
const Pipeline = require('..')

test('pipeline (api assertions)', t => {
	t.throws(() => new Pipeline('foo'))
})

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
	await t.throws(new Pipeline(async ctx => {
		ctx.dispose(true)
		ctx.use(foo)
	}).enable())
})

test('use (api assertions)', async t => {
	await t.throws(new Pipeline(async ctx => {
		ctx.use('foo')
	}).enable())
})

test('sync handlers', async t => {
	t.is(await new Pipeline(ctx => {
		return 'foo'
	}).enable(), 'foo')
	t.is(await t.throws(new Pipeline(ctx => {
		throw 'foo'
	}).enable()), 'foo')
	t.is(await new Pipeline(async ctx => {
		return ctx.use(() => 'foo')
	}).enable(), 'foo')
	t.is(await t.throws(new Pipeline(async ctx => {
		await ctx.use(() => {
			throw 'foo'
		})
	}).enable()), 'foo')
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

test('pull (api assertions)', async t => {
	async function foo() {}
	function throws(cb) {
		return t.throws(new Pipeline(async ctx => {
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
		t.pass()
	}).enable()
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

test('dispose error', async t => {
	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', addDisposal => {
			addDisposal(Promise.reject('foo'))
		})
	})
	await pipeline.enable()
	pipeline.on('dispose-error', err => {
		t.is(err, 'foo')
	})
	await pipeline.disable()
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

test('add multiple (and non-) disposals', async t => {
	let resolved = 0
	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', addDisposal => {
			const duplicate = new Promise(resolve => setImmediate(() => {
				resolved++
				resolve()
			}))
			addDisposal(duplicate)
			addDisposal(duplicate)
			addDisposal(new Promise(resolve => setImmediate(() => {
				resolved++
				resolve()
			})))
			addDisposal('foo')
		})
	})
	await pipeline.enable()
	await pipeline.disable()
	t.is(resolved, 2)
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
		ctx.on('dispose', addDisposal => {
			addDisposal(new Promise(resolve => setImmediate(() => {
				disposalResolved = true
				resolve()
			})))
		})
	})
	await pipeline.enable()
	t.false(disposalResolved)
	await pipeline.disable()
	t.true(disposalResolved)
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

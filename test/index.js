'use strict'

const test = require('ava')
const Pipeline = require('..')

test('pipeline (api assertions)', t => {
	t.throws(() => new Pipeline('foo'))
	t.throws(() => new Pipeline(() => {}, 'bar'))
})

test('exports', async t => {
	await new Pipeline(async ctx => {
		t.true(ctx.exports && typeof ctx.exports === 'object')
	}).enable()
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

test('dependency tests', async t => {
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

test('await context disposal (promise executor)', async t => {
	let disposed = false
	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', addDisposal => {
			addDisposal((resolve, reject) => {
				t.is(typeof resolve, 'function')
				t.is(typeof reject, 'function')
				setTimeout(() => {
					disposed = true
					resolve()
				}, 50)
			})
		})
	})
	await pipeline.enable()
	const disposal = pipeline.disable()
	t.false(disposed)
	await disposal
	t.true(disposed)
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

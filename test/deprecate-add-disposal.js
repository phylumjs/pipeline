'use strict'

const test = require('ava')
const {Pipeline} = require('..')

test('emit warning once', async t => {
	let emitted = false
	let resolved = false

	const emitNative = process.emitWarning
	process.emitWarning = (...args) => {
		if (/addDisposal.*deprecated/i.test(args[0])) {
			emitted = true
		} else {
			emitNative(...args)
		}
	}

	const pipeline = new Pipeline(async ctx => {
		ctx.on('dispose', addDisposal => {
			addDisposal(new Promise(resolve => {
				setTimeout(() => {
					resolved = true
					resolve()
				}, 100)
			}))
			t.true(emitted)
			addDisposal('foo')
		})
	})
	await pipeline.enable()
	await pipeline.disable()
	t.true(resolved)
	t.pass()
})

// @ts-check
'use strict'

import test from 'ava'
import { Task, Pipeline } from '..'

test('use', async t => {
	const values = []

	const foo = new class extends Task {
		run() {
			this.activity(new Promise(resolve => {
				this.push('foo')
				this.push('bar')
				resolve()
			}))
		}
	}

	const bar = new class extends Task {
		async run() {
			values.push(await this.use(foo))
		}
	}

	await bar.start()
	await new Pipeline()
		.attach(foo)
		.attach(bar)
		.done()

	t.deepEqual(values, ['foo', 'bar'])
})

// @ts-check
'use strict'

import test from 'ava'
import capture from './util/capture-task'
import { Task } from '..'

test('require run implementation', async t => {
	const task = new Task()
	const output = capture(task)
	await task.start()
	t.is(output.length, 1)
	t.true(output[0].reject instanceof Error)
})

// @ts-check
'use strict'

import test from 'ava'
import ticks from './util/ticks'
import { EventAggregator, Pipeline, Task, TaskDisposeErrorEvent } from '..'

test('dispose error', async t => {
	const task = new class extends Task {
		run() {}
		dispose() {
			throw new Error('test')
		}
	}

	new EventAggregator()
		.attach(task)
		.subscribe(TaskDisposeErrorEvent, event => {
			t.is(event.channel, TaskDisposeErrorEvent)
			t.is(event.task, task)
			t.is(event.error.message, 'test')
		})

	await task.start()
	task.stop()
	await task.done()
})

test('start', async t => {
	const task = new class extends Task {
		run() {
			t.pass()
		}
	}
	await new Pipeline()
		.attach(task)
		.start()
})

test('stop', async t => {
	const task = new class extends Task {
		run() {}
		dispose() {
			t.pass()
		}
	}
	await task.start()
	new Pipeline()
		.attach(task)
		.stop()
})

test('inactive', async t => {
	let done = false
	const task = new class extends Task {
		async run() {
			await ticks(2)
			done = true
		}
	}
	await task.start()
	await new Pipeline()
		.attach(task)
		.done()
	t.true(done)
})

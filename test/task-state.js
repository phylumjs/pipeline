'use strict'

import test from 'ava'
import ticks from './util/ticks'
import { Task } from '..'

test('start/stop', async t => {
	const task = new class extends Task {
		run() {}
	}
	t.false(task.started)
	task.start()
	t.true(task.started)
	task.stop()
	t.false(task.started)
})

test('reset', async t => {
	const task = new class extends Task {
		run() {}
		dispose() {
			t.pass()
		}
	}
	await task.start()
	t.true(await task.reset())
})

test('reset while stopped', async t => {
	const task = new class extends Task {
		run() {
			t.fail()
		}
		dispose() {
			t.fail()
		}
	}
	t.false(await task.reset())
})

test('run delays activity', async t => {
	let done = false
	const task = new class extends Task {
		async run() {
			await ticks(4)
			done = true
		}
	}
	await task.start()
	await task.done()
	t.true(done)
})

test('dispose delays activity', async t => {
	let disposed = false
	const task = new class extends Task {
		run() {}
		async dispose() {
			await ticks(4)
			disposed = true
		}
	}
	await task.start()
	task.stop()
	await task.done()
	t.true(disposed)
})

test('activity delays start', async t => {
	let mayRun = false
	let runCalled = false
	const task = new class extends Task {
		run() {
			t.true(mayRun)
			runCalled = true
		}
	}
	task.activity(ticks(4).then(() => {
		t.false(runCalled)
		mayRun = true
	}))
	task.start().then(() => {
		t.true(runCalled)
	})
	task.start().then(() => {
		t.true(runCalled)
	})
	await task.done()
	t.true(runCalled)
})

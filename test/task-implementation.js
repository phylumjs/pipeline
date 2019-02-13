'use strict'

import test from 'ava'
import capture from './util/capture-task'
import { Task } from '../dist/node'

test('class', async t => {
    let runCalled = false
    let disposeCalled = false
    class TaskImpl extends Task {
        run() {
            runCalled = true
        }
        dispose() {
            disposeCalled = true
        }
    }

    const task = new TaskImpl()
    await task.start()
    task.stop()
    await task.inactive()
    t.true(runCalled)
    t.true(disposeCalled)
})

test('constructor', async t => {
    let runCalled = false
    let disposeCalled = false
    const task = new Task({
        run() {
            runCalled = true
        },
        dispose() {
            disposeCalled = true
        }
    })
    await task.start()
    task.stop()
    await task.inactive()
    t.true(runCalled)
    t.true(disposeCalled)
})

test('require run implementation', async t => {
    const task = new Task()
    const output = capture(task)
    await task.start()
    t.is(output.length, 1)
    t.true(output[0].reject instanceof Error)
})

'use strict'

import test from 'ava'
import ticks from './util/ticks'
import { Task } from '../dist/node'
import { reduceEachLeadingCommentRange } from 'typescript';

test('start/stop', async t => {
    const task = new Task({
        run() {}
    })
    t.false(task.started)
    task.start()
    t.true(task.started)
    task.stop()
    t.false(task.started)
})

test('run delays activity', async t => {
    let done = false
    const task = new Task({
        async run() {
            await ticks(4)
            done = true
        }
    })
    await task.start()
    await task.inactive()
    t.true(done)
})

test('dispose delays activity', async t => {
    let disposed = false
    const task = new Task({
        run() {},
        async dispose() {
            await ticks(4)
            disposed = true
        }
    })
    await task.start()
    task.stop()
    await task.inactive()
    t.true(disposed)
})

test('activity delays run', async t => {
    let mayRun = false
    let runCalled = false
    const task = new Task({
        run() {
            runCalled = true
            t.true(mayRun)
        }
    })
    task.activity(ticks(4).then(() => {
        t.false(runCalled)
        mayRun = true
    }))
    task.start().then(() => {
        t.true(runCalled)
    })
    await task.inactive()
    t.true(runCalled)
})

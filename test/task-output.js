'use strict'

import test from 'ava'
import capture from './util/capture-task'
import ticks from './util/ticks'
import { Task } from '..'

test('run only', async t => {
    const task = new Task({
        async run() {
            return 'foo'
        }
    })
    const output = capture(task)
    task.start()
    await task.inactive()
    t.deepEqual(output, [{resolve: 'foo'}])
})

test('push only', async t => {
    const task = new Task({
        run() {
            this.push('foo')
        }
    })
    const output = capture(task)
    task.start()
    await task.inactive()
    t.deepEqual(output, [{resolve: 'foo'}])
})

test('mixed', async t => {
    const task = new Task({
        async run() {
            this.push(ticks(2).then(() => 'baz'))
            this.push('bar')
            this.activity(ticks(4).then(() => {
                this.push('later')
            }))
            return 'foo'
        }
    })
    const output = capture(task)
    await task.start()
    await task.inactive()
    t.deepEqual(output, [{resolve: 'baz'}, {resolve: 'bar'}, {resolve: 'foo'}, {resolve: 'later'}])
})

test('run error handling', async t => {
    const task = new Task({
        run() {
            throw new Error('test')
        }
    })
    const output = capture(task)
    await task.start()
    await task.inactive()
    t.is(output.length, 1)
    t.is(output[0].reject.message, 'test')
})

test('unpipe', async t => {
    const task = new Task({
        run() {
            this.push('foo')
            this.push('bar')
        }
    })
    const consumer = {push: state => {
        task.unpipe(consumer)
        state.then(value => {
            t.is(value, 'foo')
        })
    }}
    task.pipe(consumer)
    await task.start()
    await task.inactive()
})

test('pipe, push latest immediately', async t => {
    const task = new Task({
        async run() {
            return 'foo'
        }
    })
    await task.start()
    const output = capture(task)
    await task.inactive()
    t.deepEqual(output, [{resolve: 'foo'}])
})

// @ts-check
'use strict';

import test from 'ava';
import capture from './util/capture';
import ticks from './util/ticks';
import { Container, Task } from '..';

test('output order', async t => {
    const task = new class extends Task {
        async run() {
            this.push(ticks(3).then(() => 'foo'));
            await ticks(1);
            this.push('bar');
            return 'baz';
        }
    }(new Container());
    const output = capture(task);
    await task.activate();
    await ticks(4);
    t.deepEqual(output, [{v: 'foo'}, {v: 'baz'}, {v: 'bar'}]);
});

test('output latest', async t => {
    const task = new class extends Task {
        async run() {
            return 'foo';
        }
    }(new Container());
    task.activate();
    await ticks(2);
    task.pipe(state => {
        state.then(value => {
            t.is(value, 'foo');
        });
    });
});

test('output uncaught exceptions', async t => {
    const task = new class extends Task {
        run() {
            throw 'foo';
        }
    }(new Container());
    const output = capture(task);
    await task.activate();
    await ticks(1);
    t.deepEqual(output, [{e: 'foo'}]);
});

test('error shorthand', async t => {
    const task = new class extends Task {
        run() {
            this.error('foo');
        }
    }(new Container());
    const output = capture(task);
    await task.activate();
    await ticks(1);
    t.deepEqual(output, [{e: 'foo'}]);

});

test('unpipe', async t => {
    const task = new class extends Task {
        run() {
            this.push('foo');
            this.push('bar');
        }
    }(new Container());
    const dispose = task.pipe(state => {
        dispose();
        state.then(value => {
            t.is(value, 'foo');
        });
    });
    task.activate();
    await ticks(1);
});

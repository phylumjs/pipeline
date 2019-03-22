// @ts-check
'use strict';

import test from 'ava';
import capture from './util/capture';
import next from './util/next';
import ticks from './util/ticks';
import { dispose, Task } from '..';

test('order', async t => {
    const task = new Task(async task => {
        task.return(ticks(1).then(() => 'bar'));
        task.return('baz');
        return 'foo';
    });
    t.deepEqual(await capture(task).forTicks(2), [{r: 'bar'}, {r: 'baz'}, {r: 'foo'}]);
});

test('errors', async t => {
    const task = new Task(task => {
        task.throw('foo');
        task.return('bar');
        task.throw('baz');
    });
    t.deepEqual(await capture(task).forTicks(1), [{e: 'foo'}, {r: 'bar'}, {e: 'baz'}]);
});

test('clear output after reset', async t => {
    let output = 0;
    const task = new Task(async () => {
        return output++;
    });
    task.start();
    t.is(await next(task), 0);
    task.reset();
    t.is(await next(task), 0);
    await task.inactive();
    t.is(await next(task), 1);
});

test('clear output after stop', async t => {
    let output = 0;
    const task = new Task(async () => {
        return output++;
    });
    const dependent = task.start();
    t.is(await next(task), 0);
    dispose(dependent);
    t.is(await next(task), 0);
    await task.inactive();
    const nextOutput = next(task);
    task.start();
    t.is(await nextOutput, 1);
});


import test from 'ava';
import { capture, next } from './util';
import { Task } from '../src';

test('catch synchronous start error', async t => {
    const task = new Task(() => {
        throw 'foo';
    });
    t.deepEqual(await capture(task).forTicks(1), [{e: 'foo'}]);
});

test('catch synchronous start error after reset', async t => {
    let reset = false;
    const task = new Task(task => {
        if (reset) {
            throw 'bar';
        } else {
            task.return('foo');
        }
    });
    await task.start();
    t.is(await next(task), 'foo');
    reset = true;
    task.reset();
    await task.inactive();
    t.is(await next(task).catch(e => e), 'bar');
});

test('constructor assertions', t => {
    // @ts-ignore
    t.throws(() => new Task('foo'));
});

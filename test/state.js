// @ts-check
'use strict';

import test from 'ava';
import ticks from './util/ticks';
import { dispose, Task } from '..';

test('start / stop', async t => {
    const steps = [];
    const task = new Task(async task => {
        task.using(() => {
            steps.push('dispose');
        });
        steps.push('start');
    });
    const dependent = task.start();
    await task.inactive();
    dispose(dependent);
    await task.inactive();
    t.deepEqual(steps, ['start', 'dispose']);
});

test('reset', async t => {
    const steps = [];
    const task = new Task(async task => {
        task.using(async () => {
            await ticks(1);
            steps.push('dispose');
        });
        steps.push('start');
    });
    task.start();
    await task.inactive();
    task.reset();
    await task.inactive();
    t.deepEqual(steps, ['start', 'dispose', 'start']);
});

test('reset / stop (overlap)', async t => {
    const steps = [];
    const task = new Task(async task => {
        task.using(async () => {
            await ticks(2);
            steps.push('dispose');
        });
        steps.push('start');
    });
    const dependent = task.start();
    await task.inactive();
    task.reset();
    await ticks(1);
    dispose(dependent);
    await task.inactive();
    t.deepEqual(steps, ['start', 'dispose']);
});

test('stop / reset (overlap)', async t => {
    const steps = [];
    const task = new Task(async task => {
        task.using(async () => {
            await ticks(2);
            steps.push('dispose');
        });
        steps.push('start');
    });
    const dependent = task.start();
    await task.inactive();
    dispose(dependent);
    await ticks(1);
    task.reset();
    await task.inactive();
    t.deepEqual(steps, ['start', 'dispose']);
});

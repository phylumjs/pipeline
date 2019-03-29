// @ts-check
'use strict';

import test from 'ava';
import capture from './util/capture';
import ticks from './util/ticks';
import { dispose, Task } from '..';

test('use dependency', async t => {
    const a = new Task(async () => 6);
    const b = new Task(async task => 7 * await task.use(a));
    t.deepEqual(await capture(b).forTicks(1), [{r: 42}]);
});

test('use update', async t => {
    const a = new Task(async () => 6);
    const b = new Task(async task => 7 * await task.use(a));
    const output = capture(b).forTicks(2);
    ticks(1).then(() => a.return(3));
    t.deepEqual(await output, [{r: 42}, {r: 21}]);
});

test('manual add / auto remove', async t => {
    let added = false;
    let removed = false;
    const a = new Task(task => {
        task.using(() => {
            removed = true;
        });
        added = true;
    });

    const b = new Task(task => {
        task.addDependency(a);
    });

    const dependent = b.start();
    await ticks(1);
    t.true(added);
    t.false(removed);
    dispose(dependent);
    await ticks(1);
    t.true(removed);
});

test('auto add / manual remove', async t => {
    let added = false;
    let removed = false;
    const a = new Task(async task => {
        task.using(() => {
            removed = true;
        });
        added = true;
    });
    const b = new Task(async task => {
        task.use(a);
        await ticks(1);
        t.true(added);
        t.false(removed);
        task.removeDependency(a);
        await ticks(1);
        t.true(removed);
    });
    b.start();
    await ticks(1);
    await b.inactive();
});

test('dependency rejects, if disposed before result is emitted', async t => {
    t.plan(2);
    let used = false;
    const a = new Task(() => {
        used = true;
    });
    const b = new Task(async task => {
        task.use(a).catch(error => {
            t.true(error instanceof Error);
        });
        await ticks(1);
        t.true(used);
        task.removeDependency(a);
    });
    b.start();
    await ticks(1);
    await b.inactive();
});

test('add dependency while stopped', async t => {
    let disposed = false;
    const a = new Task(task => {
        task.using(() => {
            disposed = true;
        });
    });
    const b = new Task(() => {});
    b.addDependency(a);
    await b.inactive();
    t.true(disposed);
});

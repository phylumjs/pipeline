// @ts-check
'use strict';

import test from 'ava';
import ticks from './util/ticks';
import { Container, Task } from '..';

test('isActive', async t => {
    const task = new class extends Task {
        async run() {}
    }(new Container());
    t.false(task.isActive);
    task.activate();
    t.true(task.isActive);
    task.deactivate();
    t.false(task.isActive);
});

test('reset', async t => {
    let mayRun = false;
    const task = new class extends Task {
        async run() {
            t.true(mayRun);
        }
    }(new Container());
    t.false(await task.reset());
    mayRun = true;
    await task.activate();
    t.true(await task.reset());
    mayRun = false;
});

test('dispose', async t => {
    let disposed = false;
    const task = new class extends Task {
        run() {
            this.dispose(async () => {
                await ticks(1);
                disposed = true;
            });
        }
    }(new Container());
    await task.activate();
    await task.deactivate();
    t.true(disposed);
});

test('unbind dispose', async t => {
    let disposed = false;
    const task = new class extends Task {
        run() {
            const disposeBinding = this.dispose(async () => {
                await ticks(1);
                disposed = true;
            });
            disposeBinding();
        }
    }(new Container());
    await task.activate();
    await task.deactivate();
    t.false(disposed);
});

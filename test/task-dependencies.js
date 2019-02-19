// @ts-check
'use strict';

import test from 'ava';
import ticks from './util/ticks';
import { Task } from '..';

test('use task', async t => {
    const foo = new class extends Task {
        run() {
            this.push('foo');
            this.push('bar');
        }
    };
    const output = [];
    const bar = new class extends Task {
        async run() {
            output.push(await this.use(foo));
        }
    };
    await bar.activate();
    await ticks(1);
    t.deepEqual(output, ['foo', 'bar']);
});

test('use source', async t => {
    const source = {
        pipe: cb => {
            cb(Promise.resolve('foo'));
            return () => {};
        }
    };
    const foo = new class extends Task {
        async run() {
            t.is(await this.use(source), 'foo');
        }
    };
    await foo.activate();
});

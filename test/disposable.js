// @ts-check
'use strict';

import test from 'ava';
import { dispose } from '..';

test('dispose non-disposable', async t => {
    // @ts-ignore
    await dispose('foo');
    // @ts-ignore
    await dispose();
    t.pass();
});

test('dispose object', async t => {
    await dispose({
        async dispose() {
            t.pass();
        }
    });
});

test('dispose callback', async t => {
    await dispose(async () => t.pass());
});

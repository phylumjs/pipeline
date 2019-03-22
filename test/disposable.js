// @ts-check
'use strict';

import test from 'ava';
import { dispose, disposeAsync } from '..';

test('function disposable', t => {
	dispose(() => t.pass());
});

test('function async disposable', async t => {
	await disposeAsync(async () => t.pass());
});

test('object disposable', t => {
	dispose({
		dispose: () => t.pass()
	});
});

test('object async disposable', async t => {
	await disposeAsync({
		dispose: async () => t.pass()
	});
});

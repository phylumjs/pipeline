// @ts-check
'use strict';

import test from 'ava';
import { Task } from '..';

test('unhandled rejection', async t => {
	const task = new Task(() => {});

	const original = Promise.reject;
	try {
		// @ts-ignore
		Promise.reject = error => {
			t.is(error, 'foo');
		};

		task.using(async () => {
			throw 'foo';
		});
		await task.inactive();
	} finally {
		// @ts-ignore
		Promise.reject = original;
	}
});

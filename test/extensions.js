// @ts-check
'use strict';

import test from 'ava';
import next from './util/next';
import { Task } from '..';

test('fixed value', async t => {
	const fixed = Task.value('foo');
	fixed.start();
	t.is(await next(fixed), 'foo');
});

test('transform', async t => {
	const fixed = Task.value(6);
	const transformed = fixed.transform(value => value * 7);
	transformed.start();
	const value = await new Promise((resolve, reject) => {
		const disposable = transformed.pipe(state => {
			state.then(resolve, reject);
		});
		t.truthy(disposable);
	});
	t.is(value, 42);
});

test('extract', async t => {
	const fixed = Task.value({foo: 'bar'});
	const extracted = fixed.extract('foo');
	extracted.start();
	t.is(await next(extracted), 'bar');
});


import test from 'ava';
import { next } from './util';
import { Task } from '../src';

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

test('use static', async t => {
	const task = Task.value(42);
	t.is(await Task.use(task), 42);
});

test('wrap', async t => {
	/**
	 * @param {number} v
	 */
	function fn(v: number) {
		return v * 6;
	}
	const task = Task.wrap(fn, Task.value(7));
	t.is(await Task.use(task), 42);
});

test('wrapN', async t => {
	/**
	 * @param {number} a
	 * @param {number} b
	 */
	function fn(a: number, b: number) {
		return a * b * 2;
	}
	const task = Task.wrapN(fn, Task.value([3, 7]));
	t.is(await Task.use(task), 42);
})

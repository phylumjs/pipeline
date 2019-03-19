// @ts-check
'use strict';

import test from 'ava';
import ticks from './util/ticks';
import { EventAggregator, EventClient, ParallelHook, SeriesHook } from '..';

function create(type, value) {
	return Object.assign(new type(value), {channel: type});
}

test('event aggregator integration', async t => {
	const ea = new EventAggregator();
	ea.hook(ParallelHook, value => value * 7);
	const values = await ea.invoke(create(ParallelHook, 6));
	t.deepEqual(values, [42]);
});

test('event client integration', async t => {
	const ea = new EventAggregator();
	const ec = new class extends EventClient {
		async foo() {
			const values = await this.invoke(create(ParallelHook, 6));
			t.deepEqual(values, [42]);
		}
	}
	ea.hook(ParallelHook, value => value * 7);
	await ec.attach(ea).foo();
});

test('parallel hook', async t => {
	const hook = create(ParallelHook, 'foo');
	let aCompleted = false, bCompleted = false;
	hook.queue(async value => {
		t.is(value, 'foo');
		t.false(bCompleted);
		await ticks(1);
		aCompleted = true;
		return 'bar';
	});
	hook.queue(async () => {
		t.false(aCompleted);
		await ticks(1);
		bCompleted = true;
		return 'baz';
	});
	const results = await hook.invoke();
	t.deepEqual(results, ['bar', 'baz']);
});

test('series hook', async t => {
	const hook = create(SeriesHook, 'foo');
	let aCompleted = false, bCompleted = false;
	hook.queue(async value => {
		t.is(value, 'foo');
		t.false(bCompleted);
		await ticks(1);
		aCompleted = true;
		return 'bar';
	});
	hook.queue(async () => {
		t.true(aCompleted);
		await ticks(1);
		bCompleted = true;
		return 'baz';
	});
	const results = await hook.invoke();
	t.deepEqual(results, ['bar', 'baz']);
});

test('hook invalid usage', async t => {
	const hook = create(ParallelHook);
	await hook.invoke();
	t.throws(() => hook.queue(() => {}));
	t.throws(() => hook.invoke());
	t.pass();
});

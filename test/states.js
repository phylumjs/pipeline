// @ts-check
'use strict';

import test from 'ava';
import ticks from './util/ticks';
import { StateBag, StateQueue } from '..';

test('bag: overlap', async t => {
	const bag = new StateBag();
	let sequence = '';
	bag.put(ticks(2).then(() => {
		sequence += 'a';
	}));
	ticks(1).then(() => {
		bag.put(ticks(2).then(() => {
			sequence += 'b';
		}));
	});
	await bag.empty();
	t.is(sequence, 'ab');
});

test('bag: underlap', async t => {
	const bag = new StateBag();
	let sequence = '';
	bag.put(ticks(3).then(() => {
		sequence += 'a';
	}));
	ticks(1).then(() => {
		bag.put(ticks(1).then(() => {
			sequence += 'b';
		}));
	});
	await bag.empty();
	t.is(sequence, 'ba');
});

test('bag: reuse', async t => {
	const bag = new StateBag();
	let sequence = '';
	bag.put(ticks(1).then(() => {
		sequence += 'a';
	}));
	await bag.empty();
	t.is(sequence, 'a');
	bag.put(ticks(1).then(() => {
		sequence += 'b';
	}));
	await bag.empty();
	t.is(sequence, 'ab');
});

test('bag: empty', async t => {
	const bag = new StateBag();
	let shouldBeEmpty = false;
	const empty = bag.empty();
	bag.put(ticks(2).then(() => {
		shouldBeEmpty = true;
	}))
	await empty;
	t.true(shouldBeEmpty);
});

test('queue: overlap', async t => {
	const queue = new StateQueue();
	let sequence = '';
	const foo = queue.append(ticks(2).then(() => {
		sequence += 'a';
		return 'foo';
	}))
	foo.then(value => {
		t.is(value, 'foo');
		sequence += '0';
	})
	t.is(foo, queue.latest);
	const bar = queue.append(ticks(1).then(() => {
		sequence += 'b';
		return 'bar';
	}));
	await bar.then(value => {
		t.is(value, 'bar');
		sequence += '1';
	})
	t.is(bar, queue.latest);
	t.is(sequence, 'ba01');
});

test('queue: underlap', async t => {
	const queue = new StateQueue();
	let sequence = '';
	queue.append(ticks(1).then(() => {
		sequence += 'a';
	})).then(() => {
		sequence += '0';
	});
	await queue.append(ticks(2).then(() => {
		sequence += 'b';
	})).then(() => {
		sequence += '1';
	});
	t.is(sequence, 'a0b1');
});

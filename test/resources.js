// @ts-check
'use strict';

import test from 'ava';
import { Task, dispose } from '..';

test('normal dispose immediately', t => {
	const task = Task.value(null);
	task.using(() => {
		t.pass();
	});
});

test('normal dispose on stop', t => {
	const task = Task.value(null);
	const start = task.start();
	task.using(() => {
		t.pass();
	});
	dispose(start);
});

test('normal dispose on reset', t => {
	const task = Task.value(null);
	task.start();
	task.using(() => {
		t.pass();
	});
	task.reset();
});

test('normal dispose during reset', t => {
	const task = Task.value(null);
	task.start();
	task.reset();
	task.using(() => {
		t.pass();
	});
});

test('persistent dispose immediately', t => {
	const task = Task.value(null);
	task.usingPersistent(() => {
		t.pass();
	});
});

test('persistent dispose on stop', t => {
	const task = Task.value(null);
	const start = task.start();
	task.usingPersistent(() => {
		t.pass();
	});
	dispose(start);
});

test('persistent keep on reset', t => {
	const task = Task.value(null);
	task.start();
	task.usingPersistent(() => {
		t.fail();
	});
	task.reset();
	t.pass();
});

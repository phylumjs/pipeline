// @ts-check
'use strict';

import test from 'ava';
import { Container, CompositeDisposable } from '..';

test('get from factory', t => {
	const container = new Container();
	const factory = {createInstance: () => 'foo'};
	t.is(container.get(factory), 'foo');
});

test('get from factory function', t => {
	const container = new Container();
	const factory = () => 'foo';
	t.is(container.get(factory), 'foo');
});

test('get from class', t => {
	const container = new Container();
	class Foo {}
	t.true(container.get(Foo) instanceof Foo);

	class Bar {
		constructor(c) {
			t.is(c, container);
		}
	}
	t.true(container.get(Bar) instanceof Bar);
});

test('prefer factory over class', t => {
	const container = new Container();
	class Foo {
		constructor(value) {
			t.is(value, 'bar');
		}

		static createInstance() {
			return new Foo('bar');
		}
	};
	// @ts-ignore
	t.true(container.get(Foo) instanceof Foo);
});

test('get from invalid factory', t => {
	const container = new Container();
	t.throws(() => container.get(() => null));
});

test('delete', async t => {
	const container = new Container();
	const factory = () => 'foo';
	container.get(factory);
	await container.delete(factory);
	t.false(container.has(factory));
});

test('delete and dispose', async t => {
	let disposed = false;
	class Foo {
		async dispose() {
			disposed = true;
		}
	}
	const container = new Container();
	container.get(Foo);
	await container.delete(Foo);
	t.true(disposed);
});

test('has, hasOwn', t => {
	const parent = new Container();
	const child = new Container(parent);
	const factory = () => 'foo';
	t.false(child.has(factory));
	t.false(child.hasOwn(factory));
	parent.getOwn(factory);
	t.true(child.has(factory));
	t.false(child.hasOwn(factory));
	parent.delete(factory);
	t.false(child.has(factory));
	t.false(child.hasOwn(factory));
	child.getOwn(factory);
	t.true(child.has(factory));
	t.true(child.hasOwn(factory));
});

test('get, getOwn', t => {
	const parent = new Container();
	const child = new Container(parent);

	let mayInstantiate = false;
	class Foo {
		constructor() {
			t.true(mayInstantiate);
		}
	}

	mayInstantiate = true;
	t.true(parent.get(Foo) instanceof Foo);
	t.is(parent.get(Foo), parent.get(Foo));
	t.true(parent.hasOwn(Foo));
	mayInstantiate = false;

	t.is(child.get(Foo), parent.get(Foo));
	t.false(child.hasOwn(Foo));

	mayInstantiate = true;
	t.true(child.getOwn(Foo) instanceof Foo);
	mayInstantiate = false;
	t.is(child.getOwn(Foo), child.get(Foo));
	t.not(child.get(Foo), parent.get(Foo));
});

test('dispose', async t => {
	let disposed = false;
	class Foo {
		async dispose() {
			disposed = true;
		}
	}
	const container = new Container();
	container.get(Foo);
	await container.dispose();
	t.true(disposed);
});

test('get CompositeDisposable', async t => {
	t.plan(2);
	const parent = new Container();
	parent.get(CompositeDisposable);
	const container = new Container(parent);
	container.disposable(() => t.pass());
	t.true(container.hasOwn(CompositeDisposable));
	await container.dispose();
});

test('create child', async t => {
	const container = new Container();
	const child = container.createChild();
	child.disposable(() => t.pass());
	await container.dispose();
});

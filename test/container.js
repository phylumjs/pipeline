// @ts-check
'use strict';

import test from 'ava';
import { Container } from '..';

test('use factory', t => {
    const container = new Container();
    const factory = {createInstance: () => 'foo'};
    t.is(container.use(factory), 'foo');
});

test('use factory function', t => {
    const container = new Container();
    const factory = () => 'foo';
    t.is(container.use(factory), 'foo');
});

test('use class', t => {
    const container = new Container();
    class Foo {}
    t.true(container.use(Foo) instanceof Foo);

    class Bar {
        constructor(c) {
            t.is(c, container);
        }
    }
    t.true(container.use(Bar) instanceof Bar);
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
    t.true(container.use(Foo) instanceof Foo);
});

test('use invalid factory', t => {
    const container = new Container();
    t.throws(() => container.use(() => null));
});

test('delete', t => {
    const container = new Container();
    const factory = () => 'foo';
    container.use(factory);
    container.delete(factory);
    t.false(container.has(factory));
});

test('has, hasOwn', t => {
    const parent = new Container();
    const child = new Container(parent);
    const factory = () => 'foo';
    t.false(child.has(factory));
    t.false(child.hasOwn(factory));
    parent.use(factory);
    t.true(child.has(factory));
    t.false(child.hasOwn(factory));
    parent.delete(factory);
    t.false(child.has(factory));
    t.false(child.hasOwn(factory));
    child.use(factory);
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

test('clear', t => {
    const container = new Container();
    const factory = () => 'foo';
    container.use(factory);
    container.clear();
    t.false(container.has(factory));
});

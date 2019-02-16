// @ts-check
'use strict'

import test from 'ava'
import { Container } from '..'

test('create instancible', t => {
	const container = new Container()
	class Foo {
		static createInstanceFor(c) {
			t.is(container, c)
			return new Foo()
		}
	}
	const foo = container.get(Foo)
	t.true(foo instanceof Foo)
	t.is(container.get(Foo), foo)
})

test('has instancible', t => {
	const container = new Container()
	t.true(container.has(class {
		static createInstanceFor() {
			t.fail()
		}
	}))
})

test('set', t => {
	const container = new Container()
	container.set(String, 'foo')
	t.true(container.has(String))
	t.is(container.get(String), 'foo')

	container.set(String, 'bar')
	t.throws(() => container.set(String, null))
})

test('require instancible', t => {
	const container = new Container()
	t.throws(() => container.get(class {}))
	t.throws(() => container.get(class {
		static createInstanceFor() {}
	}))
})

test('delete', t => {
	const container = new Container()
	container.delete(String)
	container.set(String, 'foo')
	t.true(container.has(String))
	container.delete(String)
	t.false(container.has(String))
})

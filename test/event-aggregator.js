'use strict'

import test from 'ava'
import { EventAggregator } from '..'

test('subscribe', t => {
	const ea = new EventAggregator()
	ea.subscribe('foo', foo => {
		t.is(foo.bar, 'baz')
	})
	ea.publish({channel: 'foo', bar: 'baz'})
})

test('unsubscribe', t => {
	const ea = new EventAggregator()
	const subscription = ea.subscribe('foo', foo => {
		t.is(foo.disposed, false)
	})
	ea.publish({channel: 'foo', disposed: false})
	subscription.dispose()
	ea.publish({channel: 'foo', disposed: true})
})

test('hasListeners', t => {
	const ea = new EventAggregator()
	t.false(ea.hasListeners('foo'))
	const fooA = ea.subscribe('foo', () => {})
	t.true(ea.hasListeners('foo'))
	const fooB = ea.subscribe('foo', () => {})

	fooA.dispose()
	t.true(ea.hasListeners('foo'))
	fooB.dispose()
	t.false(ea.hasListeners('foo'))
})

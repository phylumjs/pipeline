// @ts-check
'use strict'

import test from 'ava'
import ticks from './util/ticks'
import { StateQueue } from '..'

test('overlap', async t => {
	const queue = new StateQueue()
	let sequence = ''
	const foo = queue.append(ticks(2).then(() => {
		sequence += 'a'
		return 'foo'
	}))
	foo.then(value => {
		t.is(value, 'foo')
		sequence += '0'
	})
	t.is(foo, queue.latest)
	const bar = queue.append(ticks(1).then(() => {
		sequence += 'b'
		return 'bar'
	}))
	await bar.then(value => {
		t.is(value, 'bar')
		sequence += '1'
	})
	t.is(bar, queue.latest)
	t.is(sequence, 'ba01')
})

test('underlap', async t => {
	const queue = new StateQueue()
	let sequence = ''
	queue.append(ticks(1).then(() => {
		sequence += 'a'
	})).then(() => {
		sequence += '0'
	})
	await queue.append(ticks(2).then(() => {
		sequence += 'b'
	})).then(() => {
		sequence += '1'
	})
	t.is(sequence, 'a0b1')
})

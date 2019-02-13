'use strict'

import test from 'ava'
import ticks from './util/ticks'
import { StateBag } from '../dist/node'

test('overlap', async t => {
	const bag = new StateBag()
	let sequence = ''
	bag.put(ticks(2).then(() => {
		sequence += 'a'
	}))
	ticks(1).then(() => {
		bag.put(ticks(2).then(() => {
			sequence += 'b'
		}))
	})
	await bag.empty()
	t.is(sequence, 'ab')
})

test('underlap', async t => {
	const bag = new StateBag()
	let sequence = ''
	bag.put(ticks(3).then(() => {
		sequence += 'a'
	}))
	ticks(1).then(() => {
		bag.put(ticks(1).then(() => {
			sequence += 'b'
		}))
	})
	await bag.empty()
	t.is(sequence, 'ba')
})

test('reuse', async t => {
	const bag = new StateBag()
	let sequence = ''
	bag.put(ticks(1).then(() => {
		sequence += 'a'
	}))
	await bag.empty()
	t.is(sequence, 'a')
	bag.put(ticks(1).then(() => {
		sequence += 'b'
	}))
	await bag.empty()
	t.is(sequence, 'ab')
})

test('empty', async t => {
	const bag = new StateBag()
	let shouldBeEmpty = false
	const empty = bag.empty()
	bag.put(ticks(2).then(() => {
		shouldBeEmpty = true
	}))
	await empty
	t.true(shouldBeEmpty)
})

'use strict'

const test = require('ava')
const {Pipeline, outputStream} = require('..')

function outputTest(task, expected) {
	return async t => {
		const pipeline = new Pipeline(task)
		const output = []
		await new Promise(resolve => {
			function push(entry) {
				output.push(entry)
				if (output.length >= expected.length) {
					resolve()
				}
			}
			pipeline.on('resolve', v => push({v}))
			pipeline.on('reject', e => push({e}))
			pipeline.enable()
		})
		t.deepEqual(output, expected)
	}
}

test('resolve', outputTest(outputStream((ctx, resolve, reject) => {
	resolve('foo')

	resolve(new Promise(resolve => {
		setTimeout(() => {
			resolve('baz')
		}, 100)
	}))

	resolve(new Promise((resolve, reject) => {
		setTimeout(() => {
			reject('err')
		}, 50)
	}))

	resolve('bar')
}), [
	{v: 'foo'},
	{v: 'bar'},
	{e: 'err'},
	{v: 'baz'}
]))

test('reject', outputTest(outputStream((ctx, resolve, reject) => {
		reject('foo')
		reject('bar')
}), [
	{e: 'foo'},
	{e: 'bar'}
]))

test('throw from executor', outputTest(outputStream(() => {
	throw 'foo'
}), [
	{e: 'foo'}
]))

'use strict'

const {Pipeline} = require('../..')

new Pipeline(async ctx => {
	console.log('foo')
	await new Promise(() => {})
	console.log('bar')
}).cli({module})

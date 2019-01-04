'use strict'

const Pipeline = require('../..')

new Pipeline(async ctx => {
	console.log('foo')
}).cli()

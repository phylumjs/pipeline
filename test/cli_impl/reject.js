'use strict'

const Pipeline = require('../..')

new Pipeline(async ctx => {
	throw 'bar'
}).cli({module})

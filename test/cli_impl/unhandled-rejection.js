'use strict'

const Pipeline = require('../..')

new Pipeline(async ctx => {
	new Promise((resolve, reject) => {
		setTimeout(() => {
			reject('bar')
		}, 1000)
	})
}).cli({module})

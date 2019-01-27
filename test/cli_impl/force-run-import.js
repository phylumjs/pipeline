'use strict'

const {Pipeline} = require('../..')
const pipeline = require('./force-run')

setImmediate(() => {
	console.log(pipeline instanceof Pipeline)
})

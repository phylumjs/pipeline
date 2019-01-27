'use strict'

const Pipeline = require('./pipeline').default
const Context = require('./context').default

exports.default = (entry, options) => new Pipeline(entry, options).cli(options)

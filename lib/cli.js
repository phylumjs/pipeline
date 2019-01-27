'use strict'

const Pipeline = require('./pipeline').default

exports.default = (entry, options) => new Pipeline(entry, options).cli(options)

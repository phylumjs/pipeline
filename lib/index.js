'use strict'

const Pipeline = require('./pipeline').default
const Context = require('./context').default

exports.Pipeline = Pipeline
exports.Context = Context

exports.cli = (entry, options) => new Pipeline(entry, options).cli(options)

'use strict'

const Pipeline = require('./pipeline')
const Context = require('./context')

exports.Pipeline = Pipeline
exports.Context = Context

exports.cli = (entry, options) => new Pipeline(entry, options).cli(options)

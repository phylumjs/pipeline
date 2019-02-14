// @ts-check
'use strict'

module.exports = n => new Promise(r => (function t() {
	return n > 0 ? (n--, setImmediate(t)) : r()
})())

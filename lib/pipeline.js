'use strict'

const Emitter = require('events')
const Context = require('./context')

class Pipeline extends Emitter {
	constructor(entry, options = {}) {
		if (typeof entry !== 'function') {
			throw new TypeError('entry must be a function.')
		}
		if (options === null || typeof options !== 'object') {
			throw new TypeError('options must be an object.')
		}

		super()
		this.data = {}
		this._entry = entry
		this._contexts = new Map()
		this._disposals = new Map()
		this._disposeAfter = new Set()
		this._enabled = false

		const {autoDisposeUnused} = options
		this._autoDisposeUnused = autoDisposeUnused === undefined ? true : Boolean(autoDisposeUnused)
	}

	_ensureContext(fn) {
		let ctx = this._contexts.get(fn)
		if (!ctx) {
			ctx = new Context(this, fn)
			this._contexts.set(fn, ctx)
		}
		return ctx
	}

	_addDisposal(fn, state) {
		if (state instanceof Promise) {
			state = state.catch(err => {
				this.emit('dispose-error', err)
			})
			let states = this._disposals.get(fn)
			if (!states) {
				states = new Set()
				this._disposals.set(fn, states)
			}
			states.add(state)
			state.then(() => {
				states.delete(state)
				if (states.size === 0) {
					this._disposals.delete(fn)
				}
			})
		}
	}

	async _disposalState(fn) {
		if (fn) {
			let state
			while (state = (() => {
				const states = this._disposals.get(fn)
				if (states) {
					for (const state of states) {
						return state
					}
				}
			})()) {
				await state
			}
		} else {
			let state
			while (state = (() => {
				for (const states of this._disposals.values()) {
					for (const state of states) {
						return state
					}
				}
			})()) {
				await state
			}
		}
	}

	_disposeUnused() {
		let found
		do {
			found = false
			for (const ctx of this._contexts.values()) {
				if (ctx.isUnused) {
					ctx.dispose()
					found = true
				}
			}
		} while (found)
	}

	disposeUnused() {
		this._disposeUnused()
		return this._disposalState()
	}

	_onResolveOrReject() {
		if (this._autoDisposeUnused) {
			this._disposeUnused()
		}
		for (const ctx of this._disposeAfter) {
			ctx.dispose(true)
		}
	}

	_onResolve(value) {
		this._onResolveOrReject()
		this.emit('resolve', value)
	}

	_onReject(value) {
		this._onResolveOrReject()
		this.emit('reject', value)
	}

	_onEntryDisposed() {
		if (this._enabled) {
			this._ensureContext(this._entry)._start()
		}
	}

	get isEnabled() {
		return this._enabled
	}

	enable() {
		this._enabled = true
		return this._ensureContext(this._entry)._start()
	}

	async disable() {
		if (this._enabled) {
			this._enabled = false
			for (const ctx of this._contexts.values()) {
				ctx.dispose(true)
			}
			await this._disposalState()
		}
	}

	getContext(fn) {
		if (fn === null || fn instanceof Context) {
			return fn
		}
		if (typeof fn !== 'function') {
			throw new TypeError('fn must be a context or a function.')
		}
		return this._contexts.get(fn) || null
	}

	cli({module} = {}) {
		if (module && module !== require.main) {
			module.exports = this
			return false
		}

		process.exitCode = 1
		this.on('resolve', () => {
			process.exitCode = 0
		})
		this.on('reject', err => {
			console.error(err)
			process.exitCode = 1
		})

		process.on('unhandledRejection', err => {
			console.error(err)
			process.exit(1)
		})

		process.on('SIGINT', () => {
			if (this.isEnabled) {
				this.disable()
			} else {
				process.exit(1)
			}
		})

		this.enable()
		return true
	}
}

module.exports = Pipeline

'use strict'

const Emitter = require('events')
const Context = require('./context').default

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

		const {autoDisposeUnused = true} = options
		this._autoDisposeUnused = Boolean(autoDisposeUnused)
	}

	createContext(fn) {
		return new Context(this, fn)
	}

	_ensureContext(fn) {
		let ctx = this._contexts.get(fn)
		if (!ctx) {
			ctx = this.createContext(fn)
			this._contexts.set(fn, ctx)
		}
		return ctx
	}

	_addDisposal(ctx, state) {
		if (state instanceof Promise) {
			state = state.catch(err => {
				this.emit('dispose-error', err, ctx)
			})
			let states = this._disposals.get(ctx._fn)
			if (!states) {
				states = new Set()
				this._disposals.set(ctx._fn, states)
			}
			states.add(state)
			state.then(() => {
				states.delete(state)
				if (states.size === 0) {
					this._disposals.delete(ctx._fn)
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

	_onSetEntryState(state, ctx) {
		state.then(value => {
			this._onResolveOrReject()
			this.emit('resolve', value, ctx)
		}, err => {
			this._onResolveOrReject()
			this.emit('reject', err, ctx)
		})
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

exports.default = Pipeline

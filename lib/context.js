'use strict'

const Emitter = require('events')

class Context extends Emitter {
	constructor(pipeline, fn) {
		super()
		this.exports = {}
		this.pipeline = pipeline
		this._fn = fn
		this._state = null
		this._dependencies = new Set()
		this._dependents = new Set()
		this._updateHandlers = new Map()
		this._disposed = false
	}

	get isEntry() {
		return this.pipeline._entry === this._fn
	}

	get isUnused() {
		return !this.isEntry && this._dependents.size === 0
	}

	_ensureDependency(fn) {
		const ctx = this.pipeline._ensureContext(fn)
		this._dependencies.add(ctx)
		ctx._dependents.add(this)
		return ctx
	}

	_start() {
		if (!this._state) {
			this._setState((async () => {
				await this.pipeline._disposalState(this._fn)
				return this._fn(this)
			})())
		}
		return this._state
	}

	_setState(state) {
		if (state instanceof Promise) {
			state.catch(() => {})
		} else {
			state = Promise.resolve(state)
		}
		this._state = state
		if (this.isEntry) {
			this._state.then(
				value => this.pipeline._onResolve(value),
				value => this.pipeline._onReject(value))
		}
	}

	_update(fn) {
		const handler = this._updateHandlers.get(fn)
		if (handler) {
			handler(this.use(fn))
		} else {
			this.dispose(false)
		}
	}

	use(fn) {
		if (typeof fn !== 'function') {
			throw new TypeError('fn must be a function.')
		}
		if (this._disposed) {
			throw new Error('Context is disposed.')
		}
		return this._ensureDependency(fn)._start()
	}

	push(state) {
		this._setState(state)
		for (const dependent of this._dependents) {
			dependent._update(this._fn)
		}
	}

	pull(fn, handler) {
		if (typeof fn !== 'function') {
			throw new TypeError('fn must be a function.')
		}
		if (typeof handler !== 'function') {
			throw new TypeError('handler must be a function.')
		}
		if (this._disposed) {
			return false
		}
		if (this._updateHandlers.has(fn)) {
			throw new Error('Multiple update handlers for the same entry.')
		}
		this._updateHandlers.set(fn, handler)
		this._ensureDependency(fn)
		return true
	}

	pullImmediate(fn, handler) {
		if (typeof fn !== 'function') {
			throw new TypeError('fn must be a function.')
		}
		if (typeof handler !== 'function') {
			throw new TypeError('handler must be a function.')
		}
		if (this._disposed) {
			return false
		}
		if (this._updateHandlers.has(fn)) {
			throw new Error('Multiple update handlers for the same entry.')
		}
		this._updateHandlers.set(fn, handler)
		const ctx = this._ensureDependency(fn)
		setImmediate(() => handler(ctx._start()))
		return true
	}

	isPulling(fn) {
		if (typeof fn !== 'function') {
			throw new TypeError('fn must be a function.')
		}
		return this._updateHandlers.has(fn)
	}

	drop(fn) {
		this._updateHandlers.delete(fn)
		const dependency = this.pipeline._contexts.get(fn)
		if (dependency) {
			dependency._dependents.delete(this)
			this._dependencies.delete(dependency)
		}
	}

	dispose(silent = false) {
		if (!this._disposed) {
			this._disposed = true
			this.emit('dispose', state => {
				this.pipeline._addDisposal(this._fn, state)
			})
			this.pipeline._contexts.delete(this._fn)

			for (const dependency of this._dependencies) {
				dependency._dependents.delete(this)
				this._dependencies.delete(dependency)
			}
			for (const dependent of this._dependents) {
				dependent._dependencies.delete(this)
				this._dependents.delete(dependent)
				if (!silent) {
					dependent._update(this._fn)
				}
			}
			if (!silent && this.isEntry) {
				this.pipeline._onEntryDisposed()
			}
		}
	}
}

module.exports = Context

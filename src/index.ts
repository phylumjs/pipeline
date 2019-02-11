
export interface TaskConsumer<T> {
	push(state: Promise<T>)
}

export abstract class Task<T> {
	private _started: boolean = false
	private _outputQueue: Promise<any> = Promise.resolve()
	private _output: Promise<T> = null
	private _consumers: Set<TaskConsumer<T>> = new Set()

	protected abstract run(): void | Promise<T>
	protected dispose(): void | Promise<any> {}

	protected push(state: Promise<T>) {
		this._output = new Promise((resolve, reject) => {
			this._outputQueue = this._outputQueue.then(() => {
				return state.then(resolve, reject)
			})
		})
		Array.from(this._consumers).forEach(consumer => {
			consumer.push(this._output)
		})
	}

	protected activity(state: Promise<any>) {
		// TODO: Enqueue activity.
	}

	public start() {
		if (!this._started) {
			this._started = true
			// TODO: Await pending activity.
			try {
				const state = this.run()
				if (state instanceof Promise) {
					this.push(state)
				}
			} catch (err) {
				this.push(Promise.reject(err))
			}
		}
	}

	public stop() {
		if (this._started) {
			this._started = false

			try {
				const state = this.dispose()
				if (state instanceof Promise) {
					this.activity(state.catch(err => {
						// TODO: Handle dispose error.
					}))
				}
			} catch (err) {
				// TODO: Handle dispose error.
			}
		}
	}

	public pipe(consumer: TaskConsumer<T>) {
		this._consumers.add(consumer)
		if (this._output) {
			consumer.push(this._output)
		}
		return this
	}

	public unpipe(consumer: TaskConsumer<T>) {
		this._consumers.delete(consumer)
		return this
	}
}

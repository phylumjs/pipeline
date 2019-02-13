
import { StateBag } from './state-bag'
import { StateQueue } from './state-queue'

export class Task<T> {
	private _started: boolean = false
	private _activity: StateBag = new StateBag()
	private _output: StateQueue<T> = new StateQueue()
	private _consumers: Set<Task.Consumer<T>> = new Set()

	constructor(options?: Task.Options<T>) {
		if (options) {
			if (options.run) {
				this.run = options.run
			}
			if (options.dispose) {
				this.dispose = options.dispose
			}
		}
	}

	protected run(): void | Promise<T> {
		throw new Error(`${this.constructor.name}.prototype.run is not implemented.`)
	}

	protected dispose(): void | Promise<any> {
	}

	protected push(state: T | Promise<T>) {
		if (state instanceof Promise) {
			this._activity.put(state)
		} else {
			state = Promise.resolve(state)
		}
		this._output.append(state)
		Array.from(this._consumers).forEach(c => c.push(this._output.latest))
	}

	protected activity(state: Promise<any>) {
		this._activity.put(state)
	}

	public get started() {
		return this._started
	}

	public async start() {
		if (!this._started) {
			this._started = true
			await this._activity.empty().then(() => {
				const state = this.run()
				if (state instanceof Promise) {
					this.push(state)
				}
			}).catch(error => {
				this.push(Promise.reject(error))
			})
		}
	}

	public stop() {
		if (this._started) {
			this._started = false
			this._activity.put(Promise.resolve().then(() => this.dispose()).catch(error => {
				// TODO: Handle error.
			}))
		}
	}

	public async inactive() {
		await this._activity.empty()
	}

	public pipe(consumer: Task.Consumer<T>) {
		this._consumers.add(consumer)
		const latest = this._output.latest
		if (latest) {
			consumer.push(latest)
		}
		return this
	}

	public unpipe(consumer: Task.Consumer<T>) {
		this._consumers.delete(consumer)
		return this
	}
}

export namespace Task {
	export interface Options<T> {
		run: () => void | Promise<T>
		dispose: () => void | Promise<any>
	}

	export interface Consumer<T> {
		push(state: Promise<T>): void
	}
}

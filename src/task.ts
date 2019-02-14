
import { EventAggregator, EventTarget, Event } from './events'
import { StartTasksEvent, StopTasksEvent, TasksDoneEvent } from './pipeline'
import { StateBag, StateQueue } from './states'

/**
 * Base class for asynchronous tasks. A task is also an {@link EventTarget} and can be attached to a {@link Pipeline} or any other {@link EventAggregator}.
 * @template T The output type.
 */
export abstract class Task<T> extends EventTarget {
	private _started: Promise<void>
	private _activity = new StateBag()
	private _output = new StateQueue<T>()
	private _consumers = new Set<TaskConsumer<T>>()

	/**
	 * Called to run or start the task.
	 * This function is called at the earliest when all previous activity is done.
	 * @returns {void|Promise<T>} A promise to use as the task output.
	 */
	protected abstract run(): void | Promise<T>

	/**
	 * Called to dispose the task.
	 * @returns {void|Promise<any>} A promise to register as activity.
	 */
	protected dispose(): void | Promise<any> {
	}

	/**
	 * Push task output.
	 * @param {T | Promise<T>} output The task output. If this is a promise, it will be registered as activity too.
	 */
	protected push(output: T | Promise<T>) {
		if (output instanceof Promise) {
			this._activity.put(output)
		} else {
			output = Promise.resolve(output)
		}
		this._output.append(output)
		Array.from(this._consumers).forEach(consumer => {
			consumer(this._output.latest)
		})
	}

	/**
	 * Use another task's output. If the task pushes an additional output (state), this task will be reset.
	 * @param {Task<T>} task The task.
	 * @returns {Promise<T>} A promise that resolves with the latest available task output.
	 * @template T The other task's output type.
	 */
	protected use<T>(task: Task<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			let pushed = false
			const binding = task.pipe(state => {
				if (pushed) {
					binding.dispose()
					this.reset()
				} else {
					pushed = true
					state.then(resolve, reject)
				}
			})
			task.start()
		})
	}

	/**
	 * Register an activity.
	 * @param {Promise<any>} state The activity state.
	 */
	protected activity(state: Promise<any>) {
		this._activity.put(state)
	}

	protected * subscribe(ea: EventAggregator) {
		yield ea.subscribe<StartTasksEvent>(StartTasksEvent, e => {
			e.starting.add(this.start())
		})

		yield ea.subscribe(StopTasksEvent, () => {
			this.stop()
		})

		yield ea.subscribe<TasksDoneEvent>(TasksDoneEvent, e => {
			e.activity.add(this.done())
		})
	}

	/**
	 * Check if the task has been started.
	 * @returns {boolean} false, if the task has not been started or {@link stop} has been called.
	 */
	public get started() {
		return Boolean(this._started)
	}

	/**
	 * Start the task if it is currently stopped. This will await pending activity before starting the actual implementation.
	 * @returns {Promise<void>} A promise that resolves when this task is fully started.
	 */
	public async start() {
		if (!this._started) {
			this._started = this._activity.empty().then(() => {
				const state = this.run()
				if (state instanceof Promise) {
					this.push(state)
				}
			}).catch(error => {
				this.push(Promise.reject(error))
			})
		}
		await this._started
	}

	/**
	 * Stop the task if it is currently started.
	 */
	public stop() {
		if (this._started) {
			this._started = null
			this._activity.put(Promise.resolve().then(() => this.dispose()).catch(error => {
				this.publish(new TaskDisposeErrorEvent(this, error))
			}))
		}
	}

	/**
	 * Restart the task only if it currently started.
	 * @returns {Promise<boolean>} A promise that resolves with false if the task was stopped and with true when this task is fully started.
	 */
	public async reset() {
		if (this.started) {
			this.stop()
			await this.start()
			return true
		}
		return false
	}

	/**
	 * Get a promise that resolves when there is no more pending activity.
	 */
	public async done() {
		await this._activity.empty()
	}

	/**
	 * Pipe the latest and future output of this task to the specified consumer.
	 * If the latest output is available, it will be pushed immediately.
	 * @param {TaskConsumer<T>} consumer The consumer.
	 * @returns {TaskConsumerBinding} The consumer binding.
	 */
	public pipe(consumer: TaskConsumer<T>): TaskConsumerBinding {
		this._consumers.add(consumer)
		const latest = this._output.latest
		if (latest) {
			consumer(latest)
		}
		return {dispose: () => this._consumers.delete(consumer)}
	}
}

/**
 * A function that is called for each output that a task pushes. Passed states will resolve in order.
 */
export type TaskConsumer<T> = (state: Promise<T>) => void

/**
 * Represents the binding between a task and a task consumer.
 */
export interface TaskConsumerBinding {
	/**
	 * Remove the consumer from the task.
	 */
	dispose(): void
}

/**
 * An event that is emitted for errors that occur while stopping the task.
 */
export class TaskDisposeErrorEvent implements Event {
	public readonly channel = TaskDisposeErrorEvent

	public constructor(
		public readonly task: Task<any>,
		public readonly error: any
	) {}
}

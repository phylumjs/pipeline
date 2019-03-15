
import { Container, InstanceType } from './container';
import { FutureDisposable, DisposeCallback, DisposableObject } from './disposable';
import { EventAggregator, EventClient, Event } from './events';
import { StateBag, StateQueue } from './states';

/**
 * Base class for all task implementations.
 * Task instances can be obtained from a container.
 * @template T The output type.
 */
export abstract class Task<T> extends EventClient implements TaskSource<T>, DisposableObject {
	private _taskActive: Promise<void>;
	private _taskPending = new StateBag();
	private _taskDisposables = new Set<FutureDisposable>();
	private _taskOutput = new StateQueue<T>();
	private _taskOutputCallbacks = new Set<TaskOutputCallback<T>>();

	/**
	 * Create a new task.
	 * @param {Container} container The container. The task will attach itself to a pipeline from this container.
	 */
	public constructor(public readonly container: Container) {
		super();
		container.get(EventAggregator).attach(this);
	}

	/**
	 * Deactivate this task and detach it from the pipeline.
	 */
	public async dispose(): Promise<void> {
		await this.deactivate();
		this.container.get(EventAggregator).detach(this);
	}

	/**
	 * This function is called when the task is activated.
	 * @param args Arguments can be injected by the `onRun` implementation.
	 * @returns {Promise<T>} Nothing or a promise to use as output.
	 */
	protected abstract run(...args: any[]): void | Promise<T>;

	/**
	 * Call the actual run implementation.
	 * This can be used to inject arguments.
	 * @returns {Promise<T>} Nothing or a promise to use as output.
	 */
	protected onRun(): void | Promise<T> {
		return this.run();
	}

	/**
	 * Push output.
	 * The order in that output promises resolve is normalized to the order in which they are pushed.
	 * @param output The output or a promise that resolves to it.
	 */
	protected push(output: T | Promise<T>) {
		if (output instanceof Promise) {
			this._taskPending.put(output);
		} else {
			output = Promise.resolve(output);
		}
		output = this._taskOutput.append(output);
		output.catch(() => {});
		Array.from(this._taskOutputCallbacks).forEach(callback => {
			callback(output as Promise<T>);
		});
	}

	/**
	 * Push output that rejects with the specified error.
	 * @example
	 * this.error(new Error('foo!'));
	 * // is a shorthand for:
	 * this.push(Promise.reject(new Error('foo!')));
	 */
	protected error(error: any) {
		this.push(Promise.reject(error));
	}

	/**
	 * Create a new disposable that will be disposed when this task is deactivated.
	 */
	protected disposable(callback?: DisposeCallback) {
		const disposable = new FutureDisposable(callback);
		this._taskDisposables.add(disposable);
		return disposable;
	}

	/**
	 * Get the latest or next future output from a source. If the source pushes additional output, this task is reset.
	 * @param {TaskSource<S>} source The source.
	 * @returns {Promise<S>} that represents the source output.
	 * @template S The source output type.
	 */
	protected useSource<S>(source: TaskSource<S>): Promise<S> {
		return new Promise((resolve, reject) => {
			let pushed = false;
			const dispose = source.pipe(state => {
				if (pushed) {
					dispose();
					this.reset();
				} else {
					pushed = true;
					state.then(resolve, reject);
				}
			});
			if (source.activate) {
				source.activate();
			}
		});
	}

	/**
	 * Get the latest or next future output from a source obtained from this task's container. If the source pushes additional output, this task is reset.
	 * @param {InstanceType<TaskSource<S>>} sourceType The source type.
	 * @returns {Promise<S>} that represents the source output.
	 * @template S The source output type.
	 */
	protected use<S>(sourceType: InstanceType<TaskSource<S>>): Promise<S> {
		return this.useSource(this.container.get<TaskSource<S>>(sourceType));
	}

	/**
	 * Ensure that the task is activated.
	 * @returns {Promise<void>} that resolves when the task is active. This promise should never reject an may be ignored.
	 */
	public activate() {
		if (!this._taskActive) {
			this._taskActive = this._taskPending.empty().then(() => {
				const state = this.onRun();
				if (state instanceof Promise) {
					this.push(state);
				}
			}).catch(error => {
				this.push(Promise.reject(error));
			});
		}
		return this._taskActive;
	}

	/**
	 * Ensure that the task is deactivated and dispose all disposables.
	 * @returns {Promise<void>} that resolves when the task is inactive and all disposables are disposed. This promise should never reject an may be ignored.
	 */
	public deactivate() {
		if (this._taskActive) {
			this._taskActive = null;

			const disposables = Array.from(this._taskDisposables);
			this._taskDisposables.clear();
			for (const disposable of disposables) {
				this._taskPending.put(disposable.dispose().catch(error => {
					this.publish(new TaskError(this, error));
				}));
			}
		}
		return this._taskPending.empty().then();
	}

	/**
	 * Deactivate and then reactivate this task only if it is already active.
	 * @returns {Promise<boolean>} that resolves to true, when this task has been reactivated. This promise should never reject an may be ignored.
	 */
	public async reset() {
		if (this._taskActive) {
			this.deactivate();
			await this.activate();
			return true;
		}
		return false;
	}

	/**
	 * Check if this task is active.
	 * Calling {@link activate} or {@link deactivate} change this property immediately.
	 * @returns {boolean}
	 */
	public get isActive() {
		return Boolean(this._taskActive);
	}

	/**
	 * Pipe the latest and all future output of this task to the specified callback.
	 * @param {TaskOutputCallback<T>} callback The callback. This will be called immediately, if any output is already available.
	 * @returns {TaskBinding} The callback binding.
	 */
	public pipe(callback: TaskOutputCallback<T>): TaskBinding {
		this._taskOutputCallbacks.add(callback);
		const latest = this._taskOutput.latest;
		if (latest) {
			callback(latest);
		}
		return () => {
			this._taskOutputCallbacks.delete(callback);
		};
	}
}

/**
 * Represents a task type.
 */
export type TaskType<T extends Task<any>> = new(container: Container) => T;

/**
 * A callback that is called with promises that represent task output.
 * This can be called at any time, but promises resolve in order.
 */
export type TaskOutputCallback<T> = (state: Promise<T>) => void;

/**
 * Represents a generic binding to a task.
 * Call this function to dispose the binding.
 */
export type TaskBinding = () => void;

/**
 * Represents a source of output.
 */
export interface TaskSource<T> {
	/**
	 * Pipe the latest and all future output of this source to the specified callback.
	 * @param {TaskOutputCallback<T>} callback The callback. This should be called immediately, if any output is already available.
	 * @returns {TaskBinding} The callback binding.
	 */
	pipe(callback: TaskOutputCallback<T>): TaskBinding;

	/**
	 * If implemented, this function can be called to ensure that this source is active.
	 */
	activate?(): any;
}

/**
 * An event that is published when any error occurs that is not related to the task output.
 * This event should be treated critical in production environments.
 */
export class TaskError implements Event {
	public readonly channel = TaskError;
	public constructor(
		/**
		 * The task that published this event.
		 */
		public readonly task: Task<any>,
		/**
		 * The error.
		 */
		public readonly error: any
	) {}
}

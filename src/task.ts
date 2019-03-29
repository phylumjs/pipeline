
import { AsyncDisposable, Disposable, disposeAsync, dispose } from './disposable';
import { ActivityBag } from './internal/activity-bag';
import { StateQueue } from './internal/state-queue';

/**
 * Function that is called to start the iteration of a task.
 * @param {Task<T>} task The task itself.
 */
export type TaskFunc<T> = (task: Task<T>) => void | Promise<T>;

/**
 * Function that is called when a task result is available.
 * @param {Task<T>} value The result.
 */
export type TaskConsumer<T> = (value: Promise<T>) => void;

export class Task<T> {
	/**
	 * Create a new task.
	 * @param func The function that is called when the task is started or after it has been reset.
	 */
	public constructor(func: TaskFunc<T>) {
		if (typeof func !== 'function') {
			throw new TypeError('func must be a function.');
		}
		this._func = func;
	}

	private readonly _func: TaskFunc<T>;
	private readonly _activity = new ActivityBag();
	private readonly _dependents = new Set<symbol>();
	private readonly _resources = new Set<AsyncDisposable>();
	private readonly _output = new StateQueue<T>();
	private readonly _consumers = new Set<TaskConsumer<T>>();
	private readonly _sources = new Map<Task<any>, Promise<any>>();
	private readonly _dependencies = new Map<Task<any>, Disposable>();
	private _started = false;
	private _resetting = false;

	/**
	 * If set to a function, it will be called for every critical error that occurs.
	 * If not set to a function, a unhandled promise rejection will occur for any critical error.
	 */
	public static criticalErrorCallback: (error: any, task: Task<any>) => void;

	/**
	 * Emit a result.
	 * @param value The result.
	 */
	public return(value: T | Promise<T>) {
		if (value instanceof Promise) {
			this.activity(value);
		} else {
			value = Promise.resolve(value);
		}
		value = this._output.append(value);
		value.catch(() => {});
		this._consumers.forEach(c => c(value as Promise<T>));
	}

	/**
	 * Emit an error as the result.
	 * @param error The error.
	 */
	public throw(error: any) {
		this.return(Promise.reject(error));
	}

	/**
	 * Register a resource to be disposed when this task is reset or stopped.
	 * If this task is currently beeing reset or stopped, the resource is disposed immediately.
	 * @param resource The resource.
	 */
	public using(resource: AsyncDisposable) {
		if (this._started && !this._resetting) {
			this._resources.add(resource);
		} else {
			this.criticalActivity(disposeAsync(resource));
		}
	}

	private disposeResources() {
		for (const resource of this._resources) {
			this._resources.delete(resource);
			this.criticalActivity(disposeAsync(resource));
		}
	}

	/**
	 * Add and start a dependency.
	 * @param source The dependency.
	 */
	public addDependency(source: Task<any>) {
		if (this._dependencies.has(source)) {
			return;
		}
		const dependency = source.start();
		if (this._started) {
			this._dependencies.set(source, dependency);
		} else {
			dispose(dependency);
		}
	}

	/**
	 * Remove a dependency and stop it if it has no other dependents.
	 * @param source The dependency.
	 */
	public removeDependency(source: Task<any>) {
		const dependency = this._dependencies.get(source);
		if (dependency) {
			this._dependencies.delete(source);
			dispose(dependency);
		}
	}

	private disposeDependencies() {
		for (const [source, dependency] of this._dependencies) {
			this._dependencies.delete(source);
			dispose(dependency);
		}
	}

	/**
	 * Register activity.
	 * The next iteration will not be started until all activity is done.
	 * @param activity The activity. Rejections are ignored.
	 */
	public activity<T>(activity: Promise<T>): Promise<T> {
		this._activity.put(activity);
		return activity;
	}

	private criticalActivity(activity: Promise<any>) {
		this._activity.put(activity.catch(error => {
			if (Task.criticalErrorCallback) {
				Task.criticalErrorCallback(error, this);
			} else {
				Promise.reject(error);
			}
		}));
	}

	/**
	 * Wait until this task is inactive.
	 */
	public inactive() {
		return this._activity.empty();
	}

	/**
	 * Pipe the results of this task to the specified consumer.
	 * Outdated results are discarded.
	 * @param consumer The consumer.
	 */
	public pipe(consumer: TaskConsumer<T>): Disposable {
		this._consumers.add(consumer);
		if (this._output.latest) {
			Promise.resolve().then(() => consumer(this._output.latest));
		}
		return () => {
			this._consumers.delete(consumer);
		}
	}

	/**
	 * Add a dependency and get it's latest result.
	 * When the dependency updates it's result, this task will be reset.
	 * @param source The dependency.
	 * @returns The latest result.
	 */
	public use<T>(source: Task<T>): Promise<T> {
		let promise: Promise<T> = this._sources.get(source);
		if (!promise) {
			this._sources.set(source, promise = new Promise((resolve, reject) => {
				let pushed = false;
				const consumer = source.pipe(state => {
					if (pushed) {
						dispose(consumer);
						this.reset();
					} else {
						pushed = true;
						state.then(resolve, reject);
					}
				});
				this.addDependency(source);
				source.using(() => {
					if (!pushed) {
						reject(new Error('The task has been disposed before emitting an initial result.'));
					}
				});
			}));
		}
		return promise;
	}

	/**
	 * Start this task.
	 * @returns A resource that represents the dependency between the caller and this task. When all resources are disposed, the task will be stopped.
	 */
	public start(): Disposable {
		const dependent = Symbol();
		this._dependents.add(dependent);
		if (!this._started) {
			this._started = true;
			this.inactive().then(() => {
				this._sources.clear();
				const value = this._func(this);
				if (value instanceof Promise) {
					this.return(value);
				}
			}).catch(error => {
				this.throw(error);
			});
		}

		return () => {
			this._dependents.delete(dependent);
			if (this._dependents.size === 0 && this._started) {
				this._started = false;
				this.disposeResources();
				this.inactive().then(() => {
					this._sources.clear();
					this._output.clear();
					this.disposeDependencies();
				});
			}
		};
	}

	/**
	 * Restart this task if it is currently running.
	 */
	public reset() {
		if (this._started && !this._resetting) {
			this._resetting = true;
			this.disposeResources();
			this.inactive().then(() => {
				this._sources.clear();
				this._output.clear();
				this._resetting = false;
				if (this._started) {
					const value = this._func(this);
					if (value instanceof Promise) {
						this.return(value);
					}
				}
			}).catch(error => {
				this.throw(error);
			});
		}
	}

	/**
	 * Create an extension of this task that emits different output.
	 * @param transform The output transform.
	 * @returns An extension of this task.
	 */
	public transform<P>(transform: (value: T) => P) {
		const task = Object.create(this);
		task.pipe = (consumer: TaskConsumer<P>) => {
			return this.pipe(state => consumer(state.then(transform)));
		};
		return task as Task<P>;
	}

	/**
	 * Create an extension of this task that extracts a property of the output and emits it instead.
	 * @param prop The property key to extract.
	 * @returns An extension of this task.
	 */
	public extract<P extends keyof T>(prop: P) {
		return this.transform(value => value[prop]);
	}

	/**
	 * Create a task that always returns the same value.
	 * @param value The value.
	 */
	public static value<T>(value: T): Task<T> {
		return new Task(task => {
			task.return(value);
		});
	}
}

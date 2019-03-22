
import { AsyncDisposable, Disposable, disposeAsync, dispose } from './disposable';
import { ActivityBag } from './internal/activity-bag';
import { StateQueue } from './internal/state-queue';

export type TaskFunc<T> = (task: Task<T>) => void | Promise<T>;

export type TaskConsumer<T> = (value: Promise<T>) => void;

export type TaskErrorHandler<T> = (error: any, origin: Task<T>) => boolean | void;

export class Task<T> {
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
	private readonly _errorHandlers = new Set<TaskErrorHandler<T>>();
	private static readonly _globalErrorHandlers = new Set<TaskErrorHandler<any>>();
	private _started = false;
	private _resetting = false;

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

	public throw(error: any) {
		this.return(Promise.reject(error));
	}

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

	public activity<T>(activity: Promise<T>): Promise<T> {
		this._activity.put(activity);
		return activity;
	}

	private criticalActivity(activity: Promise<any>) {
		this._activity.put(activity.catch(error => {
			for (const handler of this._errorHandlers) {
				if (handler(error, this)) {
					return;
				}
			}
			for (const globalHandler of Task._globalErrorHandlers) {
				if (globalHandler(error, this)) {
					return;
				}
			}
			Promise.reject(error);
		}));
	}

	public inactive() {
		return this._activity.empty();
	}

	public pipe(consumer: TaskConsumer<T>): Disposable {
		this._consumers.add(consumer);
		if (this._output.latest) {
			Promise.resolve().then(() => consumer(this._output.latest));
		}
		return () => {
			this._consumers.delete(consumer);
		}
	}

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
			}));
		}
		return promise;
	}

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

	public async reset() {
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

	public addErrorHandler(handler: TaskErrorHandler<T>) {
		this._errorHandlers.add(handler);
	}

	public static addGlobalErrorHandler(handler: TaskErrorHandler<any>) {
		this._globalErrorHandlers.add(handler);
	}
}


import { EventClient, Event } from './events';
import { StateBag, StateQueue } from './states';

/**
 * Base class for all task implementations.
 * @template T The output type.
 */
export abstract class Task<T> extends EventClient implements TaskSource<T> {
    private _active: Promise<void>;
    private _pending = new StateBag();
    private _disposeCallbacks = new Set<TaskDisposeCallback>();
    private _output = new StateQueue<T>();
    private _outputCallbacks = new Set<TaskOutputCallback<T>>();

    /**
     * This function is called when the task is activated.
     * @returns {Promise<T>} Nothing or a promise to use as output.
     */
    protected abstract run(): void | Promise<T>;

    /**
     * Push output.
     * The order in that output promises resolve is normalized to the order in which they are pushed.
     * @param output The output or a promise that resolves to it.
     */
    protected push(output: T | Promise<T>) {
        if (output instanceof Promise) {
            this._pending.put(output);
        } else {
            output = Promise.resolve(output);
        }
        output = this._output.append(output);
        output.catch(() => {});
        Array.from(this._outputCallbacks).forEach(callback => {
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
     * Attach a callback to invoke when this task is stopped.
     * @param {TaskDisposeCallback} callback The callback.
     * @returns The callback binding.
     */
    protected dispose(callback: TaskDisposeCallback): TaskBinding {
        this._disposeCallbacks.add(callback);
        return () => {
            this._disposeCallbacks.delete(callback);
        };
    }

    /**
     * Get the latest or next future output from a source. If the source pushes additional output, this task is reset.
     * @param {TaskSource<S>} source The source.
     * @returns {Promise<S>} that represents the source output.
     * @template T The source output type.
     */
    protected use<S>(source: TaskSource<S>): Promise<S> {
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
     * Ensure that the task is activated.
     * @returns {Promise<void>} that resolves when the task is active. This promise should never reject an may be ignored.
     */
    public activate() {
        if (!this._active) {
            this._active = this._pending.empty().then(() => {
                const state = this.run()
                if (state instanceof Promise) {
                    this.push(state);
                }
            }).catch(error => {
                this.push(Promise.reject(error));
            });
        }
        return this._active;
    }

    /**
     * Ensure that the task is deactivated.
     * This will invoke dispose callbacks and wait until all disposals and outputs are resolved.
     * @returns {Promise<void>} that resolves when the task is inactive. This promise should never reject an may be ignored.
     */
    public deactivate() {
        if (this._active) {
            this._active = null;

            const callbacks = Array.from(this._disposeCallbacks);
            this._disposeCallbacks.clear();
            for (const callback of callbacks) {
                this._pending.put(Promise.resolve().then(callback).catch(error => {
                    this.publish(new TaskError(this, error));
                }));
            }
        }
        return this._pending.empty().then();
    }

    /**
     * Deactivate and then reactivate this task only if it is already active.
     * @returns {Promise<boolean>} that resolves to true, when this task has been reactivated. This promise should never reject an may be ignored.
     */
    public async reset() {
        if (this._active) {
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
        return Boolean(this._active);
    }

    /**
     * Pipe the latest and all future output of this task to the specified callback.
     * @param {TaskOutputCallback<T>} callback The callback. This will be called immediately, if any output is already available.
     * @returns {TaskBinding} The callback binding.
     */
    public pipe(callback: TaskOutputCallback<T>): TaskBinding {
        this._outputCallbacks.add(callback);
        const latest = this._output.latest;
        if (latest) {
            callback(latest);
        }
        return () => {
            this._outputCallbacks.delete(callback);
        };
    }
}

/**
 * A callback that is invoked when the task is disposed.
 * @returns {Promise<void>} that delays the promise returned by {@link Task.prototype.stop} and the next execution of the task.
 */
export type TaskDisposeCallback = () => void | Promise<void>;

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

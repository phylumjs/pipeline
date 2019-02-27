
/**
 * A disposable with an asynchronously resolvable callback that allows asynchronous
 * disposing at a time where it is unknown how to actually dispose a resource.
 */
export class Disposable {
	/**
	 * Create a disposable.
	 * @param callback An optional callback to immediately resolve this disposable.
	 */
	public constructor(callback?: DisposeCallback) {
		if (callback) {
			this.resolve(callback);
		}
	}

	private _disposed = false;
	private _callback = new Promise<DisposeCallback>(resolve => this._resolve = resolve);
	private _resolve: (callback: DisposeCallback) => void;
	private _resolved = false;

	/**
	 * Resolve the callback that will be invoked as soon as the disposable is disposed.
	 * @param {DisposeCallback} callback The callback.
	 */
	public resolve(callback?: DisposeCallback) {
		if (callback && this._resolved) {
			throw new Error('This disposable is already resolved.');
		}
		this._resolve(callback);
		this._resolved = true;
	}

	/**
	 * Dispose this disposable.
	 * This will wait until an optional callback is resolved and the disposal is complete.
	 */
	public async dispose() {
		if (!this._disposed) {
			this._disposed = true;
			const callback = await this._callback;
			if (callback) {
				await callback();
			}
		}
	}
}

/**
 * A callback to dispose something.
 * @returns {void | PromiseLike<void>} An optional promise that resolves to indicate that the disposal is complete.
 */
export type DisposeCallback = () => void | PromiseLike<void>;

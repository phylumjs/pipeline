
/**
 * A disposable.
 */
export interface DisposableObject {
	/**
	 * Dispose this disposable.
	 * @returns {void | Promise<void>} An optional promise that resolves to indicate that the disposal is complete.
	 */
	dispose(): void | Promise<void>;
}

/**
 * A callback to dispose something.
 * @returns {void | Promise<void>} An optional promise that resolves to indicate that the disposal is complete.
 */
export type DisposeCallback = () => void | Promise<void>;

/**
 * Check if a value is a dispose callback.
 * @param value
 */
export function isDisposeCallback(value: any): value is DisposeCallback {
	return typeof value === 'function';
}

/**
 * Check if a value is a disposable object.
 * @param value
 */
export function isDisposableObject(value: any): value is DisposableObject {
	return value && isDisposeCallback(value.dispose);
}

/**
 * Dispose a disposable.
 * @param disposable
 */
export function dispose(disposable: Disposable): void | Promise<void> {
	if (isDisposableObject(disposable)) {
		return disposable.dispose();
	}
	if (isDisposeCallback(disposable)) {
		return disposable();
	}
}

/**
 * A disposable object or a callback.
 */
export type Disposable = DisposableObject | DisposeCallback;

/**
 * A disposable that allows asynchronous resolving of the actual disposable.
 */
export class FutureDisposable implements DisposableObject {
	/**
	 * Create a disposable.
	 * @param disposable An optional disposable to immediately resolve this disposable.
	 */
	public constructor(disposable?: Disposable) {
		if (disposable) {
			this.resolve(disposable);
		}
	}

	private _disposed = false;
	private _disposable = new Promise<Disposable>(resolve => this._resolve = resolve);
	private _resolve: (callback: Disposable) => void;
	private _resolved = false;

	/**
	 * Resolve this future disposable.
	 * @param {Disposable} disposable The disposable.
	 */
	public resolve(disposable?: Disposable) {
		if (disposable && this._resolved) {
			throw new Error('This disposable is already resolved.');
		}
		this._resolve(disposable);
		this._resolved = true;
	}

	public async dispose() {
		if (!this._disposed) {
			this._disposed = true;
			const disposable = await this._disposable;
			if (disposable) {
				await dispose(disposable);
			}
		}
	}
}

/**
 * A disposable that is composed of multiple disposables.
 */
export class CompositeDisposable implements DisposableObject {
	private _disposables = new Set<Disposable>();

	/**
	 * Add a disposable.
	 * @param disposable The disposable.
	 */
	public add(disposable: Disposable) {
		this._disposables.add(disposable);
		return this;
	}

	public async dispose() {
		const disposals = [];
		for (const disposable of this._disposables) {
			dispose(disposable);
			this._disposables.delete(disposable);
		}
		await Promise.all(disposals);
	}
}

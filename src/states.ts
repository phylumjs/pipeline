
/**
 * A bag of pending promises that can resolve a promise when it's empty.
 */
export class StateBag {
	private _top: Promise<void> = Promise.resolve();

	/**
	 * Put a promise in the bag.
	 * @param {Promise<any>} state The promise.
	 */
	public put(state: Promise<any>) {
		this._top = this._top.then(() => state.then(() => {}, () => {}));
	}

	/**
	 * Get a promise that resolves when this bag does not contain pending promises.
	 */
	public async empty() {
		for (let top; top !== this._top; ) {
			await (top = this._top);
		}
	}
}

/**
 * A queue that ensures that promises resolve in the same order they were appended to it.
 */
export class StateQueue<T> {
	private _top: Promise<void> = Promise.resolve();
	private _latest: Promise<T> = null;

	/**
	 * Get a wrapper promise that represents the specified one, but does not resolve before all previously appended promises.
	 * @param {Promise<T>} state The promise.
	 */
	public append(state: Promise<T>): Promise<T> {
		state.catch(() => {});
		return this._latest = new Promise((resolve, reject) => {
			this._top = this._top.then(() => {
				return state.then(resolve, reject);
			});
		});
	}

	/**
	 * Get the latest wrapper promise.
	 * @returns {Promise<T>} The wrapper promise or null if no promise was appended.
	 */
	public get latest() {
		return this._latest;
	}
}

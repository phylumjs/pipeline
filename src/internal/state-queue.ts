
export class StateQueue<T> {
	private _tail: Promise<any> = Promise.resolve();
	private _latest: Promise<T> = null;

	public append(state: Promise<T>): Promise<T> {
		state.catch(() => {});
		return this._latest = new Promise((resolve, reject) => {
			this._tail = this._tail.then(() => {
				return state.then(resolve, reject);
			});
		});
	}

	public get latest() {
		return this._latest;
	}
}

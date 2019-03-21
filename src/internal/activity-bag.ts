
export class ActivityBag {
	private _tail: Promise<any> = Promise.resolve();

	public put(state: Promise<any>) {
		this._tail = this._tail.then(() => state.catch(() => {}));
	}

	public async empty() {
		for (let tail; tail !== this._tail; ) {
			await (tail = this._tail);
		}
	}
}

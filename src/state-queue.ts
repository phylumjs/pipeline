
export class StateQueue<T> {
	private _top: Promise<void> = Promise.resolve()
	private _latest: Promise<T> = null

	public append(state: Promise<T>): Promise<T> {
		state.catch(() => {})
		return this._latest = new Promise((resolve, reject) => {
			this._top = this._top.then(() => {
				return state.then(resolve, reject)
			})
		})
	}

	public get latest() {
		return this._latest
	}
}

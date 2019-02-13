
export class StateBag {
	private _top: Promise<void> = Promise.resolve()

	public put(state: Promise<any>) {
		this._top = this._top.then(() => state.then(() => {}, () => {}))
	}

	public async empty() {
		for (let top; top !== this._top; ) {
			await (top = this._top)
		}
	}
}

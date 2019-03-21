
export type Disposable = (() => void | Promise<void>) | {dispose(): void | Promise<void>};

export async function dispose(disposable: Disposable) {
	if (typeof disposable === 'function') {
		await disposable();
	} else if (typeof disposable.dispose === 'function') {
		await disposable.dispose();
	}
}

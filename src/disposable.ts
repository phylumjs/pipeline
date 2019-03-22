
export type Disposable = (() => void) | {dispose(): void};

export type AsyncDisposable = (() => void | Promise<void>) | {dispose(): void | Promise<void>};

export function dispose(disposable: Disposable) {
	if (typeof disposable === 'function') {
		disposable();
	} else if (disposable && typeof disposable.dispose === 'function') {
		disposable.dispose();
	}
}

export async function disposeAsync(disposable: AsyncDisposable) {
	if (typeof disposable === 'function') {
		await disposable();
	} else if (disposable && typeof disposable.dispose === 'function') {
		await disposable.dispose();
	}
}

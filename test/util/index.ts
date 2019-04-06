
import { dispose, Task } from '../../src';

export function capture<T>(task: Task<T>, depend = true) {
    const output: ({r: T} | {e: any})[] = [];
    const binding = task.pipe(state => {
        state.then(r => {
            output.push({r});
        }).catch(e => {
            output.push({e});
        });
    });
    const dependent = depend && task.start();
    return {
        async forTicks(n: number) {
            await ticks(n);
            dispose(binding);
            dispose(dependent);
            return output;
        }
    };
}

export function next<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const consumer = task.pipe(state => {
            dispose(consumer);
            state.then(resolve, reject);
        });
    });
}

export function ticks(n: number): Promise<void> {
	return new Promise(r => (function t() {
		return n > 0 ? (n--, setTimeout(t, 0)) : r();
	})());
}

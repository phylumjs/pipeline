
import { Event } from './events';

/**
 * Base class for all hook implementations.
 * @template A The action type.
 * @template R The result type.
 */
export abstract class Hook<A, R> implements Event {
	abstract channel: any;
	private _invoked = false;
	private readonly _actions: A[] = [];

	/**
	 * Queue an action.
	 * @param {A} action The action.
	 */
	public queue(action: A) {
		if (this._invoked) {
			throw new Error('Hook was already invoked.');
		}
		this._actions.push(action);
	}

	/**
	 * Invoke actions according to the hook type.
	 * @param {A[]} actions An array of all queued actions.
	 * @returns {Promise<R>} that resolves when all invoked actions have completed.
	 */
	protected abstract invokeActions(actions: A[]): Promise<R>;

	/**
	 * Invoke the hook.
	 * @returns {Promise<R>} that resolves when all invoked actions have completed.
	 */
	public invoke(): Promise<R> {
		if (this._invoked) {
			throw new Error('Hook was already invoked.');
		}
		this._invoked = true;
		return this.invokeActions(this._actions);
	}
}

/**
 * Base class for hooks that invoke all actions in parallel.
 * It returns an array of action outputs.
 * @template T The action parameter type.
 * @template O The action output type.
 */
export abstract class ParallelHook<T = void, O = any> extends Hook<HookAction<T, O>, O[]> {
	/**
	 * Create a new parallel hook.
	 * @param {T} value The parameter that is passed to all actions.
	 */
	public constructor(public readonly value: T) {
		super();
	}

	protected invokeActions(actions: HookAction<T, O>[]): Promise<O[]> {
		return Promise.all(actions.map(async a => a(this.value)));
	}
}

/**
 * Base class for hooks that invoke all actions in series.
 * It returns an array of action outputs.
 * @template T The action parameter type.
 * @template O The action output type.
 */
export abstract class SeriesHook<T = void, O = any> extends Hook<HookAction<T, O>, O[]> {
	/**
	 * Create a new series hook.
	 * @param {T} value The parameter that is passed to all actions.
	 */
	public constructor(public readonly value: T) {
		super();
	}

	protected async invokeActions(actions: HookAction<T, O>[]): Promise<O[]> {
		const results: O[] = [];
		for (const action of actions) {
			results.push(await action(this.value));
		}
		return results;
	}
}

/**
 * An action that can be queued on a hook.
 */
export type HookAction<T, O> = (value: T) => O | PromiseLike<O>;

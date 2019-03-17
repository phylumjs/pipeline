
import { CompositeDisposable, Disposable, DisposableObject, isDisposableObject } from './disposable';

/**
 * The environment in which tasks are executed.
 * Containers can hold different task instances or can be used for dependency injection.
 */
export class Container implements DisposableObject {
	private readonly _containerInstances = new Map<InstanceType<any>, any>();

	/**
	 * Create a new container with an optional parent.
	 * @param {Container} parentContainer The parent container.
	 */
	public constructor(public readonly parentContainer?: Container) {
	}

	/**
	 * Add a disposable to the `CompositeDisposable` of this container.
	 * @param disposable The disposable
	 */
	public disposable(disposable: Disposable) {
		this.get(CompositeDisposable).add(disposable);
		return this;
	}

	/**
	 * Dispose this container and all instances.
	 */
	public async dispose(): Promise<void> {
		const results = [];
		for (const [type, instance] of this._containerInstances) {
			this._containerInstances.delete(type);
			if (isDisposableObject(instance)) {
				results.push(instance.dispose());
			}
		}
		await Promise.all(results);
	}

	/**
	 * Delete an instance from this container and dispose it.
	 * @param {InstanceType<T>} type The instance type.
	 * @returns {Promise<void>} that resolves when the instance is disposed.
	 * @template T The instance type.
	 */
	public async delete<T>(type: InstanceType<T>): Promise<void> {
		const instance = this._containerInstances.get(type);
		this._containerInstances.delete(type);
		if (isDisposableObject(instance)) {
			await instance.dispose();
		}
	}

	/**
	 * Check if this or a parent container has an instance.
	 */
	public has<T>(type: InstanceType<T>): boolean {
		for (const container of this.containers()) {
			if (container._containerInstances.has(type)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if this container has an instance.
	 */
	public hasOwn<T>(type: InstanceType<T>): boolean {
		return this._containerInstances.has(type);
	}

	private _add<T>(type: InstanceType<T>): T {
		const instance = (isFactory(type) && type.createInstance(this))
			|| (isFactoryFn(type) && type(this))
			|| (isClass(type) && new type(this));
		if (!instance) {
			throw new TypeError('Unable to create instance.');
		}
		this._containerInstances.set(type, instance);
		return instance;
	}

	/**
	 * Get an existing instance from this or a parent container or create and store a new instance in this container.
	 * @param {InstanceType<T>} type The instance type.
	 * @returns {T} The instance.
	 * @template T The instance type.
	 */
	public get<T>(type: InstanceType<T>): T {
		for (const container of this.containers()) {
			const instance = container._containerInstances.get(type);
			if (instance) {
				return instance;
			}
		}
		return this._add<T>(type);
	}

	/**
	 * Get an existing instance from this container or create and store a new instance.
	 * @param {InstanceType<T>} type The instance type.
	 * @returns {T} The instance.
	 * @template T The instance type.
	 */
	public getOwn<T>(type: InstanceType<T>): T {
		const instance = this._containerInstances.get(type);
		if (instance) {
			return instance;
		}
		return this._add<T>(type);
	}

	/**
	 * Get an iterable of this and all parent containers.
	 */
	public * containers(): Iterable<Container> {
		for (let target: Container = this; target; target = target.parentContainer) {
			yield target;
		}
	}
}

/**
 * An object that can create instances.
 * @template T The instance type.
 */
export type InstanceFactory<T> = {
	/**
	 * This function is called by the container to create an instance.
	 * @param container The container.
	 * @returns {T} The instance.
	 */
	createInstance(container: Container): T
};

/**
 * A function that can create instances.
 * @template T The instance type.
 */
export type InstanceFactoryFn<T> = (container: Container) => T;

/**
 * A class that can be instantiated as the instance.
 * @template T The instance type.
 */
export interface InstanceClass<T> {
	new(container: Container): T
}

/**
 * An instance type can be used to create and store instances in containers.
 * @template T The instance type.
 */
export type InstanceType<T> = InstanceFactory<T> | InstanceFactoryFn<T> | InstanceClass<T>;

function isFactory<T>(type: InstanceType<T>): type is InstanceFactory<T> {
	return type && typeof (type as InstanceFactory<T>).createInstance === 'function';
}

function isFactoryFn<T>(type: InstanceType<T>): type is InstanceFactoryFn<T> {
	return typeof type === 'function' && !type.prototype;
}

function isClass<T>(type: InstanceType<T>): type is InstanceClass<T> {
	return typeof type === 'function' && Boolean(type.prototype);
}

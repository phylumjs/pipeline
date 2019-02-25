
/**
 * A lightweight dependency injection container.
 */
export class Container {
	private readonly _containerInstances = new Map<InstanceType<any>, any>();

	/**
	 * Create a new container with an optional parent.
	 * @param {Container} parentContainer The parent container.
	 */
	public constructor(public readonly parentContainer?: Container) {
	}

	/**
	 * Use the specified type to create and store a new instance in this container.
	 * @param {InstanceType<T>} type The instance type.
	 * @returns {T} The instance.
	 * @template T The instance type.
	 */
	public use<T>(type: InstanceType<T>): T {
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
	 * Delete an instance from this container.
	 * @param {InstanceType<T>} type The instance type.
	 * @template T The instance type.
	 */
	public delete<T>(type: InstanceType<T>) {
		this._containerInstances.delete(type);
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
		return this.use<T>(type);
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
		return this.use<T>(type);
	}

	/**
	 * Get an iterable of this and all parent containers.
	 */
	public * containers(): Iterable<Container> {
		for (let target: Container = this; target; target = target.parentContainer) {
			yield target;
		}
	}

	/**
	 * Delete all instances from this container.
	 */
	public clear() {
		this._containerInstances.clear();
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
export type InstanceClass<T> = { new(container: Container): T };

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

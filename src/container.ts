
export interface ContainerItemType<T> {
	new(...args: any[]): T
	createInstanceFor?(container: Container): T
}

/**
 * A container that can hold and create unique items of different types.
 */
export class Container {
	private _items = new Map()

	/**
	 * Add or replace an item.
	 * @param {ContainerItemType<T>} type The item type.
	 * @param {T} item The item.
	 * @template T The item type.
	 */
	public set<T>(type: ContainerItemType<T>, item: T) {
		if (!item) {
			throw new TypeError(`value must be an instance of ${type.name}`)
		}
		this._items.set(type, item)
		return this
	}

	/**
	 * Check if this container holds an instance of the specified type or if the type can create an instance dynamically.
	 * @param {ContainerItemType<T>} type The item type.
	 * @returns {boolean}
	 * @template T The item type.
	 */
	public has<T>(type: ContainerItemType<T>) {
		return this._items.has(type) || Boolean(type.createInstanceFor)
	}

	/**
	 * Delete an item.
	 * @param {ContainerItemType<T>} type The item type.
	 * @template T The item type.
	 */
	public delete<T>(type: ContainerItemType<T>) {
		this._items.delete(type)
		return this
	}

	/**
	 * Get an item from this container or create and add one if supported by the type.
	 * @param {ContainerItemType<T>} type The item type.
	 * @returns {T} The item.
	 * @template T The item type.
	 */
	public get<T>(type: ContainerItemType<T>): T {
		let item = this._items.get(type)
		if (!item) {
			if (!type.createInstanceFor) {
				throw new TypeError(`${type.name} must implement .createInstanceFor() or an instance must be provided.`)
			}
			item = type.createInstanceFor(this)
			if (!item) {
				throw new TypeError(`${type.name}.createInstanceFor() must return an instance of ${type.name}.`)
			}
			this._items.set(type, item)
		}
		return item
	}
}

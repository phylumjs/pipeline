
/**
 * A simple pub/sub system for events.
 */
export class EventAggregator {
	private _channels: Map<EventChannel<any>, Map<EventListener<any>, EventSubscription>> = new Map()

	/**
	 * Publish an event.
	 * @param {E} event The event.
	 * @template E The event type.
	 */
	public publish<E extends Event>(event: E) {
		const subscriptions = this._channels.get(event.channel)
		if (subscriptions) {
			Array.from(subscriptions.keys()).forEach(listener => listener(event))
		}
	}

	/**
	 * Check if there is at least one listener for the specified event channel.
	 * @param {EventChannel<E>} channel The event channel.
	 * @template E The event type.
	 */
	public hasListeners<E extends Event>(channel: EventChannel<E>) {
		return this._channels.has(channel)
	}

	/**
	 * Subscribe to an event.
	 * @param {EventChannel<E>} channel The event channel.
	 * @param listener The event listener.
	 * @returns {EventSubscription} The event subscription. If the specified listener was already used for this channel, the same event subscription is returned.
	 * @template E The event type.
	 */
	public subscribe<E extends Event>(channel: EventChannel<E>, listener: EventListener<E>) {
		let listeners = this._channels.get(channel)
		if (!listeners) {
			this._channels.set(channel, listeners = new Map())
		}
		let subscription = listeners.get(listener)
		if (!subscription) {
			listeners.set(listener, subscription = {
				dispose: () => {
					const listeners = this._channels.get(channel)
					if (listeners) {
						listeners.delete(listener)
						if (listeners.size === 0) {
							this._channels.delete(channel)
						}
					}
				}
			})
		}
		return subscription
	}

	/**
	 * Attach this event aggregator to an event target.
	 * @param {EventTarget} target The event target.
	 */
	public attach(target: EventTarget) {
		target.attach(this)
		return this
	}

	/**
	 * Attach this event aggregator to an event target.
	 * @param {EventTarget} target The event target.
	 */
	public detach(target: EventTarget) {
		target.detach(this)
		return this
	}
}

/**
 * Represents an event that is published on an event aggregator.
 */
export interface Event {
	/**
	 * The channel, this event is published on.
	 */
	channel: any
}

/**
 * Extract the channel type from an event type.
 * @template E The event type.
 */
export type EventChannel<E extends Event> = E extends {channel: infer C} ? C : unknown

/**
 * An event listener.
 * @param {E} event The event that was published.
 * @template E The event type.
 */
export type EventListener<E extends Event> = (event: E) => void

/**
 * Represents an event subscription.
 */
export interface EventSubscription {
	/**
	 * Unsubscribe the event listener associated with this subscription.
	 */
	dispose(): void
}

/**
 * An object that can be attached to multiple event aggregators to subscribe to or publish events.
 */
export class EventTarget {
	private _eas: Map<EventAggregator, Set<EventSubscription>> = new Map()

	/**
	 * Attach an event aggregator.
	 * @param {EventAggregator} ea The event aggregator.
	 */
	public attach(ea: EventAggregator) {
		if (!this._eas.has(ea)) {
			this._eas.set(ea, new Set(this.subscribe(ea)))
		}
		return this
	}

	/**
	 * Detach an event aggregator.
	 * @param {EventAggregator} ea The event aggregator.
	 */
	public detach(ea: EventAggregator) {
		const subscriptions = this._eas.get(ea)
		if (subscriptions) {
			for (const subscription of subscriptions) {
				subscription.dispose()
			}
			this._eas.delete(ea)
		}
		return this
	}

	/**
	 * Called when an event aggregator is attached.
	 * @param {EventAggregator} ea The event aggregator.
	 * @returns {Iterable<EventSubscription>} An iterable of event subscriptions to dispose when the event aggregator is detached.
	 */
	protected * subscribe(ea: EventAggregator): Iterable<EventSubscription> {
	}

	/**
	 * Publish an event to all attached event aggregators.
	 * @param {E} event The event.
	 * @template E The event type.
	 */
	protected publish<E extends Event>(event: E) {
		Array.from(this._eas.keys()).forEach(ea => ea.publish<E>(event))
	}

	/**
	 * Check if there is at least one listener for the specified event channel.
	 * @param {EventChannel<E>} channel The event channel.
	 * @template E The event type.
	 */
	protected hasListeners<E extends Event>(channel: EventChannel<E>) {
		for (const ea of this._eas.keys()) {
			if (ea.hasListeners(channel)) {
				return true
			}
		}
		return false
	}
}

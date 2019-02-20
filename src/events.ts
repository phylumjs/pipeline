
/**
 * A simple pub/sub system for events.
 */
export class EventAggregator {
	private readonly _eventChannels: Map<EventChannel<any>, Set<EventListener<any>>> = new Map();

	/**
	 * Publish an event.
	 * @param {E} event The event.
	 * @template E The event type.
	 */
	public publish<E extends Event>(event: E) {
		const subscriptions = this._eventChannels.get(event.channel);
		if (subscriptions) {
			Array.from(subscriptions.keys()).forEach(listener => listener(event));
		}
	}

	/**
	 * Check if there is at least one listener for the specified event channel.
	 * @param {EventChannel<E>} channel The event channel.
	 * @template E The event type.
	 */
	public hasListeners<E extends Event>(channel: EventChannel<E>) {
		return this._eventChannels.has(channel);
	}

	/**
	 * Subscribe to an event.
	 * @param {EventChannel<E>} channel The event channel.
	 * @param listener The event listener.
	 * @returns {EventSubscription} The event subscription. If the specified listener was already used for this channel, the same event subscription is returned.
	 * @template E The event type.
	 */
	public subscribe<E extends Event>(channel: EventChannel<E>, listener: EventListener<E>) {
		let listeners = this._eventChannels.get(channel);
		if (!listeners) {
			this._eventChannels.set(channel, listeners = new Set());
		}
		listeners.add(listener);
		return () => {
			listeners = this._eventChannels.get(channel);
			if (listeners) {
				listeners.delete(listener);
				if (listeners.size === 0) {
					this._eventChannels.delete(channel);
				}
			}
		};
	}

	/**
	 * Attach this event aggregator to an event target.
	 * @param {EventClient} client The event target.
	 */
	public attach(client: EventClient) {
		client.attach(this);
		return this;
	}

	/**
	 * Attach this event aggregator to an event target.
	 * @param {EventClient} client The event target.
	 */
	public detach(client: EventClient) {
		client.detach(this);
		return this;
	}
}

/**
 * Represents an event that is published on an event aggregator.
 */
export interface Event {
	/**
	 * The channel, this event is published on.
	 */
	channel: any;
}

/**
 * Extract the channel type from an event type.
 * @template E The event type.
 */
export type EventChannel<E extends Event> = E extends {channel: infer C} ? C : never;

/**
 * An event listener.
 * @param {E} event The event that was published.
 * @template E The event type.
 */
export type EventListener<E extends Event> = (event: E) => void;

/**
 * Represents an event subscription.
 * Call this function to unsubscribe the event listener associated with this subscription.
 */
export type EventSubscription = () => void;

/**
 * An object that can be attached to multiple event aggregators to subscribe to or publish events.
 */
export class EventClient {
	private _eventAggregators: Map<EventAggregator, Set<EventSubscription>> = new Map();

	/**
	 * Attach an event aggregator.
	 * @param {EventAggregator} ea The event aggregator.
	 */
	public attach(ea: EventAggregator) {
		if (!this._eventAggregators.has(ea)) {
			this._eventAggregators.set(ea, new Set(this.subscribe(ea)));
		}
		return this;
	}

	/**
	 * Detach an event aggregator.
	 * @param {EventAggregator} ea The event aggregator.
	 */
	public detach(ea: EventAggregator) {
		const subscriptions = this._eventAggregators.get(ea);
		if (subscriptions) {
			for (const dispose of subscriptions) {
				dispose();
			}
			this._eventAggregators.delete(ea);
		}
		return this;
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
		Array.from(this._eventAggregators.keys()).forEach(ea => ea.publish<E>(event));
	}

	/**
	 * Check if there is at least one listener for the specified event channel.
	 * @param {EventChannel<E>} channel The event channel.
	 * @template E The event type.
	 */
	protected hasListeners<E extends Event>(channel: EventChannel<E>) {
		for (const ea of this._eventAggregators.keys()) {
			if (ea.hasListeners(channel)) {
				return true;
			}
		}
		return false;
	}
}

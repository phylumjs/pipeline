
export class EventAggregator {
	private _channels: Map<EventAggregator.Channel<any>, Map<EventAggregator.Subscription, EventAggregator.Listener<any>>> = new Map()

	public publish<E extends EventAggregator.Event>(event: E) {
		const subscriptions = this._channels.get(event.channel)
		if (subscriptions) {
			Array.from(subscriptions.values()).forEach(listener => listener(event))
		}
	}

	public hasListeners<E extends EventAggregator.Event>(channel: EventAggregator.Channel<E>) {
		return this._channels.has(channel)
	}

	public subscribe<E extends EventAggregator.Event>(channel: EventAggregator.Channel<E>, listener: EventAggregator.Listener<E>) {
		let subscriptions = this._channels.get(channel)
		if (!subscriptions) {
			this._channels.set(channel, subscriptions = new Map())
		}
		const subscription = <EventAggregator.Subscription>{
			dispose: () => {
				subscriptions.delete(subscription)
				if (subscriptions.size === 0) {
					this._channels.delete(channel)
				}
			}
		}
		subscriptions.set(subscription, listener)
		return subscription
	}
}

export namespace EventAggregator {
	export interface Event {
		channel: any
	}

	export type Factory<E> = () => E

	export type Channel<E extends Event> = E extends {channel: infer C} ? C : unknown

	export type Listener<E extends Event> = (event: E) => void

	export interface Subscription {
		dispose(): void
	}
}

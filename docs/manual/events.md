# Events
PhylumJS includes a typed event system that can be used to communicate with tasks or to implement hooks.

## `Event`
Events are published on specific channels.<br>
Channels can be any value that can be used as a key in a `Map` object, however it is recommended to use the event class itself as channel.
```ts
import { Event } from '@phylum/pipeline';

export class MyEvent implements Event {
	// It is recommended to use the class itself as channel:
	public readonly channel = MyEvent;
}
```

## `EventAggregator`
An event aggregator is a pub/sub system for events.
```ts
import { EventAggregator } from '@phylum/pipeline';

const ea = new EventAggregator();
```

#### publish / subscribe
```ts
ea.publish(new MyEvent());

ea.subscribe<MyEvent>(MyEvent, e => {
	// "e" is an instance of MyEvent
});
```

## `EventClient`
An event client is an object that can be attached to multiple event aggregators.<br>
Event clients can subscribe or publish to multiple event aggregators with a simple api.
```ts
import { Event, EventClient } from '@phylum/pipeline';

class Ping implements Event {
	public readonly channel = Ping;
}

class Pong implements Event {
	public readonly channel = Pong;
}

class Echo extends EventClient {
	// This function is called when an event aggregator is attached:
	protected * subscribe(ea: EventAggregator): Iterable<EventSubscription> {
		// Allow the base class to subscribe to events:
		yield * super.subscribe();

		// Subscriptions will be disposed automatically
		// when the event aggregator is detached:
		yield ea.subscribe(Ping, () => {
			// Publish to all attached event aggregators:
			this.publish(new Pong());
		});
	}
}

ea.attach(new Echo());

ea.subscribe(Pong, () => {
	console.log('Pong!');
});

ea.publish(new Ping());
```

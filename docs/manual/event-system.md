# Event System
Since version **4**, the pipeline uses an event system to communicate between tasks and pipeline instances that allows much more flexibility out of the box. This event system consists of the following components:

## `EventAggregator`
A pub/sub system for events.
```ts
import { EventAggregator, Event } from '@phylum/pipeline';

const ea = new EventAggregator();
```
### Events &amp; Channels
Events are published on channels that event listeners can subscribe to.<br>
When implementing an event type, the channel can be of any type, but it is recommended to use the class itself as channel.
```ts
class MyEvent implements Event {
	// Use the MyEvent class as channel key:
	public readonly channel = MyEvent;
	public constructor(public readonly message: string) {}
}

// Subscribe to a channel:
ea.subscribe<MyEvent>(MyEvent, e => {
	console.log(e.message);
});

// Publish an event:
ea.publish(new MyEvent('Hello World!'));
```

## `EventClient`
An event client can publish or subscribe to events from multiple event aggregators.
```ts
import { EventClient } from '@phylum/pipeline';

class MyEventClient extends EventClient {
	// This function is called when an event aggregator is attached:
	* subscribe(ea) {
		// Returned event subscriptions will be disposed
		// when the event aggregator is removed:
		yield ea.subscribe<MyEvent>(MyEvent, e => { ... });
	}

	foo() {
		// Publish to all attached event aggregators:
		this.publish(new MyEvent('Hello World!'));
	}
}

const ea = new EventAggregator();

// Attach an event aggregator to a client:
client.attach(ea);

// Detach an event aggregator:
client.detach(ea);
```

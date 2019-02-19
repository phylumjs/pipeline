// @ts-check
'use strict';

import test from 'ava';
import { EventAggregator, EventClient } from '..';

test('subscribe', t => {
	const ea = new EventAggregator();
	ea.subscribe('foo', foo => {
		t.is(foo.bar, 'baz');
	});
	ea.publish({channel: 'foo', bar: 'baz'});
});

test('unsubscribe', t => {
	const ea = new EventAggregator();
	const subscription = ea.subscribe('foo', foo => {
		t.is(foo.disposed, false);
	});
	ea.publish({channel: 'foo', disposed: false});
	subscription();
	ea.publish({channel: 'foo', disposed: true});
});

test('hasListeners', t => {
	const ea = new EventAggregator();
	t.false(ea.hasListeners('foo'));
	const fooA = ea.subscribe('foo', () => {});
	t.true(ea.hasListeners('foo'));
	const fooB = ea.subscribe('foo', () => {});

	fooA();
	t.true(ea.hasListeners('foo'));
	fooB();
	t.false(ea.hasListeners('foo'));
});

test('client', t => {
	class Client extends EventClient {
		* subscribe(ea) {
			yield ea.subscribe('foo', foo => {
				t.is(foo.value, 'bar');
			});

			yield ea.subscribe('ping', ping => {
				this.publish({channel: 'pong', value: ping.value});
			});
		}

		hasListeners(channel) {
			return super.hasListeners(channel);
		}
	}

	const client = new Client();
	t.false(client.hasListeners('foo'));

	let pongReceived = false;
	const ea1 = new EventAggregator();
	ea1.subscribe('pong', pong => {
		pongReceived = true;
		t.is(pong.value, 'test');
	})
	ea1.attach(client);
	t.true(client.hasListeners('pong'));

	ea1.publish({channel: 'foo', value: 'bar'});

	const ea2 = new EventAggregator();
	ea2.attach(client);
	ea2.publish({channel: 'ping', value: 'test'});
	t.true(pongReceived);

	ea1.detach(client);
	ea1.publish({channel: 'foo', value: 42});
});

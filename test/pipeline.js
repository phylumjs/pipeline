// @ts-check
'use strict';

import test from 'ava';
import ticks from './util/ticks';
import { Container, Pipeline, Task } from '..';

test('automatically attach to tasks with container', async t => {
	const container = new Container();

	class Foo extends Task {
		run() {
			this.publish({channel: 'foo'});
		}
	}
	t.true(container.get(Foo) instanceof Foo);
	t.true(container.has(Pipeline));

	let eventReceived = false;
	container.get(Pipeline).subscribe('foo', e => {
		eventReceived = true;
	});

	await container.get(Foo).activate();
	t.true(eventReceived);
});

test('activate tasks', async t => {
	const container = new Container();
	let disposed = false;
	const foo = container.get(class extends Task {
		run() {
			this.disposable().resolve(async () => {
				await ticks(4);
				disposed = true;
			});
		}
	});
	await foo.activate();
	foo.deactivate();
	t.false(disposed);
	await container.get(Pipeline).activate();
	t.true(disposed);
});

test('deactivate tasks', async t => {
	const container = new Container();
	let disposed = false;
	await container.get(class extends Task {
		run() {
			this.disposable().resolve(async () => {
				await ticks(4);
				disposed = true;
			});
		}
	}).activate();
	await container.get(Pipeline).deactivate();
	t.true(disposed);
});

// @ts-check
'use strict';

import test from 'ava';
import { Container, Task, TaskError, EventAggregator } from '..';

test('dispose error', async t => {
    const task = new class extends Task {
        async run() {
            this.dispose(() => {
                throw 'foo';
            });
        }
    }(new Container());
    const ea = new EventAggregator();
    ea.attach(task);
    ea.subscribe(TaskError, event => {
        t.is(event.task, task);
        t.is(event.error, 'foo');
    });
    await task.activate();
    await task.deactivate();
});

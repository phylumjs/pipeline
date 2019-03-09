// @ts-check
'use strict';

import test from 'ava';
import capture from './util/capture';
import { Container, Task } from '..';

test('onRun', async t => {
    const task = new class extends Task {
        async run(foo) {
            return foo * 7;
        }
        onRun() {
            return this.run(6);
        }
    }(new Container());
    const output = capture(task);
    await task.activate();
    t.deepEqual(output, [{v: 42}]);
});

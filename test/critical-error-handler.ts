
import test from 'ava';
import { Task } from '../src';

test('global error handler', async t => {
    const task = new Task(() => {});
    Task.criticalErrorCallback = (error, origin) => {
        t.is(error, 'foo');
        t.is(origin, task);
    };
    task.using(async () => {
        throw 'foo';
    });
    await task.inactive();
});

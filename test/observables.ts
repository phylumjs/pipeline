
import test from 'ava';
import { from } from 'rxjs';
import { capture, next, ticks } from './util';
import { Task } from '../src';

test('create task', async t => {
	const target = from(['foo', 'bar']);
	const task = Task.observable(target);
	t.deepEqual(await capture(task).forTicks(1), [
		{r: 'foo'},
		{r: 'bar'}
	]);
});

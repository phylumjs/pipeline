
import test from 'ava';
import { dispose, disposeAsync } from '../src';

test('function disposable', t => {
	dispose(() => t.pass());
});

test('function async disposable', async t => {
	await disposeAsync(async () => t.pass());
});

test('object disposable', t => {
	dispose({
		dispose: () => t.pass()
	});
});

test('object async disposable', async t => {
	await disposeAsync({
		dispose: async () => t.pass()
	});
});


## Status
A new major version is currently under development.
Version 3 docs are still available [here](https://github.com/phylumjs/docs-v3/tree/master/src/pages).

# Introduction

## What is PhylumJS?
PhylumJS is a library for building dynamic &amp; customizable build systems.<br>
It's core library is an asynchronous task runner that allows tasks to update their result over time.

## Getting Started
*The following guide assumes that you have advanced knowledge of JavaScript and asynchronous programming.*

At first, install the core library and the cli:
```bash
npm i @phylum/pipeline @phylum/cli
```

Create a file **pipeline.js** in your project root that exports the main task:
```js
'use strict';

const { Task } = require('@phylum/pipeline');

exports.default = new Task(async t => {
	console.log('Hello World!');
});
```
```bash
npx phylum
# => Hello World!
```

## Emitting Results
There are two different ways to emit results.<br>
If the task function returns a promise, that promise is used as the result:
```ts
new Task(async () => {
	return 'foo';
});
```
else, `return()` and `throw()` can be used to emit results:
```ts
new Task(t => {
	t.return('foo');
	t.throw(new Error('something went wrong!'));
});
```

## Dependencies
A task can consume the single result of another task.<br>
Whenever the consumed task emits a new result, the dependent task will be reset and use the new result in the next iteration.
```js
const getMessage = new Task(async () => {
	return 'Hello World!';
});

exports.default = new Task(async t => {
	const message = await t.use(getMessage);
	console.log(message);
});
```
If a task is consumed by multiple tasks, it will be run once.

[![Build Status](https://travis-ci.org/phylumjs/pipeline.svg?branch=master)](https://travis-ci.org/phylumjs/pipeline)
[![Coverage Status](https://coveralls.io/repos/github/phylumjs/pipeline/badge.svg?branch=master)](https://coveralls.io/github/phylumjs/pipeline?branch=master)
![Version](https://img.shields.io/npm/v/@phylum/pipeline.svg)
![License](https://img.shields.io/npm/l/@phylum/pipeline.svg)
# Pipeline
A flexible async task runner

## Concepts
To easily combine processes like webpack builds and application packaging in a way that fits both development and production, these processes are organized in atomic tasks that can use other tasks as dependencies. Tasks can push updates (like new stats from webpack in watch mode) to their dependents. Updates can be handled manually or tasks are re-executed automatically.

<br/>



# Installation
```bash
npm i @phylum/pipeline
```

<br/>



# Documentation
+ [Pipeline](#class-pipeline)
	+ [new Pipeline(entry)](#new-pipelineentry)
	+ [pipeline.data](#pipelinedata)
	+ [pipeline.isEnabled](#pipelineisenabled)
	+ [pipeline.enable()](#pipelineenable)
	+ [pipeline.disable()](#pipelinedisable)
	+ [Event: 'resolve'](#event-resolve)
	+ [Event: 'reject'](#event-reject)
	+ [Event: 'dispose-error'](#event-dispose-error)
+ [Tasks](#tasks)
	+ [ctx.data](#ctxdata)
	+ [ctx.pipeline](#ctxpipeline)
	+ [ctx.isEntry](#ctxisentry)
	+ [ctx.isUnused](#ctxisunused)
	+ [ctx.use(fn)](#ctxusefn)
	+ [ctx.push(state)](#ctxpushstate)
	+ [ctx.pull(fn, handler)](#ctxpullfn-handler)
	+ [ctx.pullImmediate(fn, handler)](#ctxpullimmediatefn-handler)
	+ [ctx.dispose(&#91;silent&#93;)](#ctxdisposesilent)
	+ [Event: 'dispose'](#event-dispose)

<br/>



# <a name="class-pipeline"></a>Pipeline
The pipeline class runs tasks and manages their states.
```js
import Pipeline from '@phylum/pipeline'
```

### new Pipeline(entry)
Create a new pipeline instance.
```js
const pipeline = new Pipeline(entry)
```
+ entry `<function>` - The entry task.

### pipeline.data
An object to store custom data.

### pipeline.isEnabled
Check wether this pipeline is enabled or not.<br/>
*Calls to .enable(..) or .disable(..) will set this value immediately without waiting for pending promises.*

### pipeline.enable()
Enable the pipeline if not enabled.
```js
await pipeline.enable()
```
+ returns `<Promise>` - The current state of the entry task.

### pipeline.disable()
Disable the pipeline if enabled and dispose all tasks.
```js
await pipeline.disable()
```
+ returns `<Promise>` - A promise that resolves when all tasks have been disposed.

### Event: 'resolve'
The *resolve* event is emitted when the entry task resolves.
```js
pipeline.on('resolve', value => {
	console.log(value)
})
```

### Event: 'reject'
The *reject* event is emitted when the entry task rejects.
```js
pipeline.on('reject', err => {
	console.error(err)
})
```

### Event: 'dispose-error'
The *dispose-error* event is emitted when an error occurs while disposing a task.
```js
pipeline.on('dispose-error', err => {
	console.error(err)
})
```

<br/>



# Tasks
Tasks are simple functions.<br/>
The task context is passed with the first argument:
```js
async function example(ctx) {
	console.log('Hello World!')
}
```

### ctx.data
An object to store custom data that is related to the current context.

### ctx.pipeline
A reference to the pipeline.

### ctx.isEntry
True if this task is the entry task of the pipeline.

### ctx.isUnused
True if this task is not used by another task.<br/>
Unused tasks will be disposed when the entry task resolves or rejects.

### ctx.use(fn)
Use another task as dependency.
If the dependency is disposed or updates, the current task is disposed.
```js
async function foo(ctx) {
	return 'Hello World!'
}

async function bar(ctx) {
	await ctx.use(foo) // -> 'Hello World!'
}
```
+ fn `<function>` - The dependency task.

### ctx.push(state)
Push an update to all dependents (and the pipeline if this task is the entry task).
```js
async function example(ctx) {
	setTimeout(() => {
		ctx.push('updated value')
	}, 1000)

	return 'initial value'
}
```
+ state `<Promise> | <any>` - The new state. If not a promise, it will be converted to a resolved promise with the specific value.
	+ Rejections are ignored until the state is picked up by a dependent task or the pipeline.

### ctx.pull(fn, handler)
Accept updates from a dependency.<br/>
*Using only .pull(..) does not start the dependency.*
```js
async function example(ctx) {
	ctx.pull(foo, state => {
		// 'foo' has updated.
	})
}
```
+ fn `<function>` - The dependency task.
+ handler `<function>` - The function to handle updates.
	+ state `<Promise>` - The new state of the dependency after the update.

### ctx.pullImmediate(fn, handler)
Use another task as dependency and accept updates.
```js
async function example(ctx) {
	ctx.pullImmediate(foo, state => {
		// 'foo' has been started or updated.
	})
}
```
+ fn `<function>` - The dependency task.
+ handler `<function>` - The function to handle the initial state and updates.
	+ state `<Promise>` - The initial or new state of the dependency.

### ctx.dispose([silent])
Dispose this task.<br/>
This will detach the task from all dependencies and dependents.
```js
async function example(ctx) {
	setTimeout(() => {
		ctx.dispose()
	}, 1000)
}
```
+ silent `<any>` - If truthy, dependent tasks and the pipeline will not be notified about the disposal. Otherwise dependent tasks will be updated and the task will be re-executed if this is the pipeline entry. Default is `false`

### Event: 'dispose'
The *dispose* event is emitted when this task is disposed.<br/>
This event should be used to destroy resources like file system watchers.
```js
async function example(ctx) {
	const watcher = new SomeFSWatcher()
	watcher.on('change', () => {
		ctx.push('something changed')
	})

	ctx.on('dispose', addDisposal => {
		addDisposal(watcher.destroy())
	})

	return 'nothing changed'
}
```
+ addDisposal `<function>` - A function to add a disposal state.
	+ state `<Promise> | <any>` - A promise to delay the re-execution of the task or the promise returned by `pipeline.disable()`.

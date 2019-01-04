[![Build Status](https://travis-ci.org/phylumjs/pipeline.svg?branch=master)](https://travis-ci.org/phylumjs/pipeline)
[![Coverage Status](https://coveralls.io/repos/github/phylumjs/pipeline/badge.svg?branch=master)](https://coveralls.io/github/phylumjs/pipeline?branch=master)
![Version](https://img.shields.io/npm/v/@phylum/pipeline.svg)
![License](https://img.shields.io/npm/l/@phylum/pipeline.svg)
# Pipeline
A flexible async task runner

## Concepts
To easily combine processes like webpack builds and application packaging in a way that fits both development and production, these processes are organized in atomic tasks that can use other tasks as dependencies. Tasks can push updates (like new stats from webpack in watch mode) to their dependents. Updates can be handled manually or tasks are re-executed automatically.

## Installation
```bash
npm i @phylum/pipeline
```

<br/>

# Quick Start
The following is a very basic node module implementing a pipeline based cli.<br/>
*For more advanced usage, refer to the [documentation](#documentation) below.*
```js
require('@phylum/pipeline').cli(async ctx => {
	// Include tasks using:
	await ctx.use(task)
})
```

### Official Packages

| Package | Purpose |
|-|-|
| [webpack-task](https://github.com/phylumjs/webpack-task) | Task for integrating webpack |
| [process-task](https://github.com/phylumjs/process-task) | Utility for implementing tasks that run child processes. |

<br/>



# Documentation
+ [Pipeline](#class-pipeline)
	+ [new Pipeline(entry&#91;, options&#93;)](#new-pipelineentry-options)
	+ [pipeline.data](#pipelinedata)
	+ [pipeline.isEnabled](#pipelineisenabled)
	+ [pipeline.enable()](#pipelineenable)
	+ [pipeline.disable()](#pipelinedisable)
	+ [pipeline.disposeUnused()](#pipelinedisposeunused)
	+ [pipeline.cli(&#91;options&#93;)](#pipelineclioptions)
	+ [Pipeline.cli(&#91;options, &#93;entry)](#pipelineclioptions-entry)
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
	+ [ctx.isPulling(fn)](#ctxispullingfn)
	+ [ctx.drop(fn)](#ctxdropfn)
	+ [ctx.dispose(&#91;silent&#93;)](#ctxdisposesilent)
	+ [Event: 'dispose'](#event-dispose)
+ [Examples](#examples)
	+ [Webpack](#webpack)
	+ [Starting processes](#starting-processes)
	+ [Building a CLI](#building-a-cli)

<br/>



# <a name="class-pipeline"></a>Pipeline
The pipeline class runs tasks and manages their states.
```js
import Pipeline from '@phylum/pipeline'
```

### new Pipeline(entry[, options])
Create a new pipeline instance.
```js
const pipeline = new Pipeline(entry)
```
+ entry `<function>` - The entry task.
+ options `<object>` - Optional. An object with the following options:
	+ autoDisposeUnused `<boolean>` - Optional. Automatically dispose unused tasks when the pipeline resolves or rejects. If disabled, unused tasks will stay alive until `pipeline.destroyUnused()` is called. Default is `true`

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

### pipeline.disposeUnused()
Manually dispose unused tasks.<br/>
*This can be used to dispose unused tasks while the pipeline is still enabled.*
```js
await pipeline.disposeUnused()
```
+ returns `<Promise>` - A promise that resolves when all tasks have been disposed.

### pipeline.cli([options])
Utility for implementing a simple cli that runs this pipeline.
+ The pipeline will be disabled when the process receives a 'SIGINT'.
+ The process will exit with code..
	+ ..**0** - if the pipeline resolved and the event loop is empty.
	+ ..**1** - if the pipeline rejected and the event loop is empty.
	+ ..**1** - if an unhandled rejection occurs.
	+ ..**1** - if the process receives a 'SIGINT' while the pipeline is disabled.

```js
pipeline.cli({module})
```
+ options `<object>` - An object with the following options:
	+ module `<Module>` - Optional. If specified and the module is not the main module, the pipeline will be exported by that module instead of running it.

### Pipeline.cli([options, ]entry)
Shorthand for creating a new pipeline and calling `.cli(..)` on it.
```js
const {cli} = require('@phylum/pipeline')

cli({module}, async ctx => {
	console.log('Hello World!')
})
```
+ options `<object>` - Optional. An object with options passed to the pipeline and the cli function.
+ entry `<function>` - The pipeline entry.

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

### ctx.isPulling(fn)
Check if an update handler was registered using `.pull(..)` or `.pullImmediate(..)`
```js
async function example(ctx) {
	ctx.isPulling(foo) === false
	ctx.pull(foo, () => { ... })
	ctx.isPulling(foo) === true
}
```
+ fn `<function>` - The dependency task.
+ returns `<boolean>` - True if an update handler is registered for the specified task. Otherwise false.

### ctx.drop(fn)
Remove a dependency and possible update handlers.<br/>
*Dropping a dependency will not dispose it automatically. See pipeline options and pipeline.disposeUnused() for more info.*
```js
async function example(ctx) {
	// ...
	ctx.drop(foo)
}
```
+ fn `<function>` - The dependency task.

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

<br/>



# Examples
The following examples show how to setup a basic build system for server-side code using webpack. It consists of a compilation task, a task that runs server code (for development) and a cli module that integrates the pipeline.

### Webpack
The following task bundles server-side code using webpack:
```js
// bundle-server.js
'use strict'

const path = require('path')
const webpack = require('webpack')

async function bundleServer(ctx) {
	const compiler = webpack({
		target: 'node',
		mode: ctx.pipeline.data.dev ? 'development' : 'production',
		entry: {index: './server.js'}
		output: {
			path: path.join(__dirname, 'dist'),
			filename: '[name].js'
		},
		// ...
	})

	return new Promise((resolve, reject) => {
		// A handler function to handle webpack results:
		let handler = (err, stats) => {
			// Set the handler to push further updates:
			handler = (err, stats) => {
				if (err) {
					ctx.push(Promise.reject(err))
				} else {
					ctx.push(stats)
				}
			}
			if (err) {
				reject(err)
			} else {
				resolve(stats)
			}
		}

		// Check if watch mode should be enabled:
		if (ctx.pipeline.data.watch) {
			// Create a watcher and call the handler for every result:
			const watcher = compiler.watch({}, (e, s) => handler(e, s))
			// Destroy the watcher when disposed:
			ctx.on('dispose', addDisposal => {
				addDisposal(new Promise(resolve => watcher.close(resolve)))
			})
		} else {
			// Run compiler without watching:
			compiler.run(handler)
		}
	})
}

module.exports = bundleServer
```

### Starting processes
The following task executes and updates server-side code in a child process:
```js
// run-server.js
'use strict'

const path = require('path')
const cp = require('child_process')
const bundleServer = require('./bundle-server')

async function runServer(ctx) {
	if (!ctx.pipeline.data.run) {
		return
	}

	let proc

	// A function to update or create the process:
	function update() {
		if (proc) {
			// This would be the place to send hmr update signals to the
			// process and waiting for a response instead restarting it.
			proc.kill()
		}
		const newProc = cp.fork(path.join(__dirname, 'dist'), {cwd: __dirname})
		newProc.on('error', err => {
			ctx.push(Promise.reject(err))
		})
		newProc.on('exit', () => {
			if (proc === newProc) {
				proc = null
			}
		})
		proc = newProc
	}

	// Pull updates from the 'bundleServer' task above:
	ctx.pullImmediate(bundleServer, state => {
		state.then(update, err => {
			ctx.push(Promise.reject(err))
		})
	})

	// Kill the process when disposed:
	ctx.on('dispose', () => {
		if (proc) {
			proc.kill()
			proc = null
		}
	})
}

module.exports = runServer
```

### Building a CLI
The following code shows how you could build a simple cli that uses the first two examples:
```js
#!/usr/bin/env node
'use strict'

const {cli} = require('@phylum/pipeline')
const parse = require('command-line-args')
const bundleServer = require('./bundle-server')
const runServer = require('./run-server')

// Task for parsing command line arguments that
// are used by the bundleServer and runServer tasks:
function commandLineArgs(ctx) {
	Object.assign(ctx.pipeline.data, parse([
		{name: 'watch', type: Boolean},
		{name: 'run', type: Boolean},
		{name: 'dev', type: Boolean}
	]))
}

cli({module}, async ctx => {
	// Parse command line args once:
	await ctx.use(commandLineArgs)

	// Include bundleServer and runServer tasks:
	await Promise.all([
		ctx.use(bundleServer),
		ctx.use(runServer)
	])
})
```
The cli will be able to do the following:

| Command | Description |
|-|-|
| `node cli` | Just compile everything and exit |
| `node cli --watch` | Compile and watch for changes |
| `node cli --run` | Compile and run |
| `node cli --watch --run` | Compile, run and watch for changes |

```js
// The cli module can also be required to get the pipeline:
const pipeline = require('./cli')
```

# Tasks
*Tasks* execute async operations.<br>
They can process the output of other tasks or update their own output over time.

## Containers
Task instances should be obtained from a container.<br>
To get started, you can use the same container for everything or [read more...](/manual/containers)
```ts
import { Container } from '@phylum/pipeline';

const container = new Container();

container.get(MyTask) // -> MyTask { ... }
```

## Events
When a task instance is created, it will attach itself to the closest **event aggregator** instance from it's container.

## Basic Implementation
Task behaviour is implemented with the `.run` function. If it returns a promise, that promise will be used as output.<br>
The following task loads a json config file:
```ts
import { Task } from '@phylum/pipeline';
import { readJson } from 'some-cool-async-fs-library';

class ConfigLoader extends Task<string> {
	async run() {
		return readJson('config.json');
	}
}
```

## Updates
When a task detects changes, it can push an updated output to it's consumers.<br>
The following task loads a json config file and pushes an update when the config file is changed.
```ts
import { readJson, watchFile } from 'some-cool-async-fs-library';

class ConfigLoader extends Task<any> {
	run() {
		// Read config:
		this.push(readJson('config.json'));

		// and watch for changes:
		const watcher = watchFile('config.json');
		watcher.on('change', () => {
			// Read updated config and update output:
			this.push(readJson('config.json'));
		})

		// When the task is deactivated, close the watcher:
		this.disposable(() => watcher.close());
	}
}
```

## Soft Dependencies
When a task uses a single output of an output source, this is called a **soft dependency**.<br>
Whenever the source emits updated output, the dependent task is reset, so that it will re-execute and use the updated output in the next run.<br>
*Note that the task could miss some updates, when the output source pushes updates while the task is beeing reset.*
```ts
class GetMessage extends Task<string> {
	async run() {
		return 'Hello World!';
	}
}

class LogMessage extends Task<void> {
	async run() {
		const message = await this.use(GetMessage);
		console.log(message);
	}
}
```

## Dynamic Dependencies
When a task implements it's own logic for handling output, this is called a **dynamic dependency**.<br>
The following is an example of a task that handles multiple output of a `getLatestMessage` task without beeing reset:
```ts
// GetLatestMessage is a task that may emit multiple outputs over time.

class LogMessage extends Task<void> {
	run() {
		// Pipe every output of the 'getLatestMessage' task
		// to the callback that handles output states:
		const binding = container.get(GetLatestMessage).pipe(state => {
			state.then(message => {
				console.log(message);
			}).catch(error => {
				// In case of an error, you may want to
				// forward it to consumers of this task:
				this.error(error);
			});
		});

		// Ensure that the task is active:
		getLatestMessage.activate();

		// 'binding' is a callback that removes the callback,
		// so we want to remove it when this task is deactivated:
		this.dispose(binding);
	}
}
```

## Resources
Resources like file system watchers that are allocated by running a task should disposed when the task is deactivated.
```ts
import { TaskContext } from '@phylum/pipeline';

class WatchFiles extends Task<void> {
	run(context: TaskContext) {
		const watcher = createSomeFSWatcher();

		// Automatically close the watcher when this task is deactivated:
		this.disposable(() => watcher.close());
	}
}
```
Note that your task can be deactivated while it is still running.<br>
If you allocate resources, you should make sure that the task is still active or use a disposable with an asynchronously resolved callback like so:
```ts
class WatchFiles extends Task<void> {
	async run(context: TaskContext) {
		const disposable = this.disposable();

		// Dome something else...

		const watcher = createSomeFSWatcher();
		// Automatically close the watcher when this task is deactivated:
		disposable.resolve(() => watcher.close());
	}
}
```

## Error Handling
If an error occurs while invoking a dispose callback, a `TaskError` event is published to all attached event aggregators:
```ts
import { TaskError } from '@phylum/pipeline';

container.get(Pipeline).subscribe<TaskError>(TaskError, error => {
	error.task; // The task that published the error.
	error.error; // The error.
});
```
If the task pushes rejected output, the emitted output states can be safely ignored without causing unhandled rejections.

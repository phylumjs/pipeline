# Tasks

## Containers
Task instances should be obtained from a container.<br>
To get started, you can use the same container for everything or [read more...](./containers.md)
```ts
import { Container } from '@phylum/pipeline';

const container = new Container();
```

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
        this.dispose(() => watcher.close());
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
        const message = await this.use(container.get(GetMessage));
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
When a task allocates resources like file system watchers, it should release these resources when it is deactivated.
```ts
class WatchFiles extends Task<void> {
    run() {
        const watcher = createSomeFSWatcher();
        // ...do something with watcher...

        // Close the watcher when this task is deactivated:
        this.dispose(() => watcher.close());
    }
}
```

## Error Handling
Critical errors should not be handled by tasks and occur in the following cases:
+ An error is thrown or rejected by a dispose callback.

In all mentioned cases, an `TaskError` event is published to event aggregators that the task is attached to.
```ts
import { TaskError, EventAggregator } from '@phylum/pipeline';

const ea = new EventAggregator();

someBrokenTask.attach(ea);

ea.subscribe<TaskError>(TaskError, error => {
    error.task; // The task that published the error.
    error.error; // The error.
});
```

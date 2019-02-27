
## Status
This is the documentation for the new beta that is current under development.<br>
Version 3 docs are still available [here](https://github.com/phylumjs/docs-v3/tree/master/src/pages).

# Installation
```bash
npm i @phylum/pipeline
```

## Quick Start

#### [Tasks](/manual/tasks)
*Tasks* execute async operations.<br>
They can process the output of other tasks or update their own output over time.

#### [Containers](/manual/containers)
A *container* represents the environment in which tasks are executed.<br>
They can hold different task instances or can be used for dependency injection.

#### [Events](/manual/events)
PhylumJS includes a typed event system that can be used to communicate with tasks or to implement hooks.

#### Example
The following example is written in [TypeScript](http://typescriptlang.org/)
```ts
import { Container, Task } from '@phylum/pipeline';

class Message extends Task<string> {
	async run() {
		return 'Hello World!';
	}
}

class Logger extends Task<void> {
	async run() {
		const message = await this.use(Message);
		console.log(message);
	}
}

new Container().get(Logger).activate();
```

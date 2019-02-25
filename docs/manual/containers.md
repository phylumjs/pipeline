# Containers
```ts
import { Container } from '@phylum/pipeline';

const container = new Container();
```
Containers are generic maps of *instance types* to *instances*.<br>
If an instance of a specific type is requested from a container, it will return an existing instance of that type or create a new instance.

## Accessing Instances
Instances can be obtained automatically using the `get` or `getOwn` function.<br>
Missing instances will be created automatically and stored in the container.
```ts
class Foo {
	constructor(container: Container) {
		// container will be passed to the constructor.
	}
}

container.get(Foo) // -> Foo { }
```
You can also delete existing instances or check for existance:
```ts
container.delete(Foo)

container.has(Foo) // -> false
```
It can be enforced that a new instance is created:
```ts
container.use(Foo) // -> Foo { }
```

## Advanced Instance Types
An instance type is used as the key for storing existing instances or for creating new ones.<br>
It should be one of the following and should always return a truthy value as the instance.
```ts
// An object or a class with a static '.createInstance' function:
class Foo {
	static createInstance(container: Container) {
		return 'foo';
	}
}

container.get(Foo) // -> 'foo'

// An arrow function:
const bar = (container: Container) => {
	return 'bar';
}

container.get(bar) // -> 'bar'

// A class:
class Baz {
	constructor(container: Container) {
	}
}

container.get(Baz) // -> Baz { }
```

## Nested Containers
Containers can be nested to share instances across containers.<br>
To create a nested container, the parent is passed to the constructor:
```ts
const parent = new Container();

const child = new Container(parent);
```
A nested container implicitly has all instances from it's parents.
```ts
parent.use(Foo);

child.has(Foo) // -> true
child.get(Foo) // -> Foo { }
```

// @ts-check
'use strict';

import test from 'ava';
import { Container, Task } from '..';

test('dispose', async t => {
    let attached = false;
    class Foo extends Task {
        run() {}
        attach(ea) {
            attached = true;
            return super.attach(ea);
        }
        detach(ea) {
            attached = false;
            return super.detach(ea);
        }
    }
    const container = new Container();
    container.get(Foo);
    t.true(attached);
    await container.dispose();
    t.false(attached);
    t.false(container.has(Foo));
});

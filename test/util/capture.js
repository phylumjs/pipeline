// @ts-check
'use strict';

const { dispose } = require('../..');
const ticks = require('./ticks');

module.exports = (task, depend = true) => {
    const output = [];
    const binding = task.pipe(state => {
        state.then(r => {
            output.push({r});
        }).catch(e => {
            output.push({e});
        });
    });
    const dependent = depend && task.start();
    return {
        async forTicks(value) {
            await ticks(value);
            dispose(binding);
            dispose(dependent);
            return output;
        }
    };
};

'use strict';

const { dispose } = require('../..');

module.exports = task => {
    return new Promise((resolve, reject) => {
        const consumer = task.pipe(state => {
            dispose(consumer);
            state.then(resolve, reject);
        });
    });
};

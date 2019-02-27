// @ts-check
'use strict';

module.exports = task => {
	const output = [];
	task.pipe(state => {
		state.then(v => {
			output.push({v});
		}).catch(e => {
			output.push({e});
		});
	});
	return output;
};

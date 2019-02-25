'use strict';

import Vue from 'vue';

const components = require.context('.', false, /\.vue$/);
components.keys().forEach(key => {
	const component = components(key).default;
	const name = /\.\/([^\.]*)/.exec(key);
	Vue.component(name[1], component);
});

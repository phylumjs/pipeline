'use strict';

import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
	mode: 'hash',
	routes: [
		{path: '/', component: () => import('./components/page-home')},
		{path: '*', component: () => import('./components/page-not-found')}
	]
});

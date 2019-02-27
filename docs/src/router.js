'use strict';

import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
	mode: 'hash',
	routes: [
		{path: '/', component: () => import('./components/page-home')},
		{path: '/manual/tasks', component: () => import('../manual/tasks')},
		{path: '/manual/containers', component: () => import('../manual/containers')},
		{path: '/manual/events', component: () => import('../manual/events')},
		{path: '*', component: () => import('./components/page-not-found')},
	]
});

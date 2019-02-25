'use strict';

import Vue from 'vue';
import App from './components/app';
import Bootstrap from 'bootstrap-vue';
import router from './router';

import './components/global';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

Vue.use(Bootstrap);

new Vue({
	el: '#app',
	router,
	render: c => c(App)
});

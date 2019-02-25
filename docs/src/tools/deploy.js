'use strict';

const { resolve } = require('path');
const { publish } = require('gh-pages');

publish(resolve(__dirname, '../dist'), {
	repo: `${process.env.DEPLOY_TOKEN}@${process.env.DEPLOY_REPO}`,
	branch: 'master',
	silent: true,
	message: process.env.DEPLOY_MESSAGE || 'Updates',
	user: {
		name: process.env.DEPLOY_AS_NAME,
		email: process.env.DEPLOY_AS_EMAIL
	}
}, error => {
	if (error) {
		console.error(error);
		process.exit(1);
	}
});

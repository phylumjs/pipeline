'use strict';

const marked = require('marked');
const escape = require('escape-html');
const {highlight} = require('highlight.js');

class Renderer extends marked.Renderer {
	link(href, title, text) {
		if (href.startsWith('/')) {
			return `<router-link to="${escape(href)}">${escape(text)}</router-link>`;
		}
		if (/^https?:\/\//.test(href)) {
			return `<a href="${escape(href)}" target="_blank">${escape(text)}</a>`;
		}
		// TODO: Transform relative links ending with '.md'
		return super.link(href, title, text);
	}
}

module.exports = function (content) {
	const callback = this.async();
	marked(content, {
		renderer: new Renderer(),
		headerIds: false,
		highlight: (code, lang) => {
			return lang ? highlight(lang, code, true).value : code;
		}
	}, (error, html) => {
		if (error) {
			callback(error);
		} else {
			callback(null, `<template>
				<app-document>
					${html}
				</app-document>
			</template>`);
		}
	});
};

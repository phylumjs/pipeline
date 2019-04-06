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
		return super.link(href, title, text);
	}
}

module.exports = function (content) {
	const callback = this.async();
	marked(content, {
		renderer: new Renderer(),
		headerIds: false,
		highlight: (code, lang) => {
			const parts = [];
			const partRegex = /\@\@(\w+)\n((?:.|\n)+?)(\@\@\w+|$)/g;
			let part;
			while (part = partRegex.exec(code)) {
				const [, lang, code, overlap] = part;
				partRegex.lastIndex -= overlap.length;
				parts.push({lang, code});
			}
			if (parts.length > 0) {
				return `<app-localized-code :langs='${
					JSON.stringify(parts.map(({lang}) => lang))
				}'>${
					parts.map(({lang, code}) => {
						return `<template :slot='${JSON.stringify(lang)}'>${highlight(lang, code).value.trim()}</template>`;
					}).join('<br>')
				}</app-localized-code>`;
			}
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

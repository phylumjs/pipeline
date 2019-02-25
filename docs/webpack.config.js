'use strict';

const { resolve } = require('path');
const { HotModuleReplacementPlugin } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const VuePlugin = require('vue-loader/lib/plugin');
const CopyPlugin = require('copy-webpack-plugin');
const CssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = (env = {}) => {
	const prod = !!env.prod;
	return {
		context: __dirname,
		mode: prod ? 'production' : 'development',
		entry: './src',
		resolve: {
			extensions: ['.wasm', '.mjs', '.js', '.json', '.vue', '.md'],
			alias: {
				vue$: prod ? 'vue/dist/vue.runtime.min.js' : 'vue/dist/vue.runtime.js'
			}
		},
		optimization: {
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						output: {
							// Terser messes up "new RegExp(...)" non-ascii character ranges.
							ascii_only: true
						}
					}
				})
			]
		},
		module: {
			rules: [
				{test: /\.vue$/, loader: 'vue-loader'},
				{test: /\.js$/, loader: 'babel-loader', exclude: prod ? undefined : /node_modules/},
				{
					test: /\.less$/,
					use: [
						prod ? CssExtractPlugin.loader : 'vue-style-loader',
						'css-loader',
						{loader: 'less-loader', options: {paths: ['./src/styles']}}
					]
				},
				{
					test: /\.css$/,
					use: [
						prod ? CssExtractPlugin.loader : 'vue-style-loader',
						'css-loader'
					]
				},
				{
					test: /\.png$/,
					loader: 'file-loader',
					options: {
						name: '[hash].[ext]',
						outputPath: 'img/'
					}
				},
				{
					test: /\.md$/,
					use: [
						'vue-loader',
						require.resolve('./src/loaders/document-loader')
					]
				}
			]
		},
		plugins: [
			new VuePlugin(),
			new HtmlPlugin({
				template: './src/index.html',
				inject: 'body',
				minify: prod ? {collapseWhitespace: true} : false
			}),
			...(prod ? [
				new OptimizeCssPlugin(),
				new CssExtractPlugin({
					filename: '[name].[hash].css'
				}),
				new CopyPlugin([
					{from: './src/static'}
				])
			] : [
				new HotModuleReplacementPlugin()
			])
		],
		devtool: prod ? false : 'inline-source-map',
		devServer: {
			contentBase: [
				resolve(__dirname, 'dist'),
				resolve(__dirname, 'src/static')
			],
			hot: true,
			historyApiFallback: true
		},
		output: {
			path: resolve(__dirname, 'dist'),
			filename: '[name].[hash].js',
			publicPath: '/'
		}
	};
};

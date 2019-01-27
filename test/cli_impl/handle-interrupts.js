'use strict'

const {Pipeline} = require('../..')

const pipeline = new Pipeline(async ctx => {
	const resource = setInterval(() => {}, 1000)

	ctx.on('dispose', () => new Promise(resolve => {
		setTimeout(() => {
			console.log('bar')
			clearInterval(resource)
			resolve()
		}, 100)
	}))

	console.log('foo')
	process.send('ready')
})

function handleMessage(msg) {
	switch (msg) {
		case 'sigint':
			process.emit('SIGINT')
			break

		case 'allow-exit':
			process.off('message', handleMessage)
			break
	}
}

process.on('message', handleMessage)

pipeline.cli({module})

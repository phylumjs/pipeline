'use strict'

const test = require('ava')
const path = require('path')
const cp = require('child_process')

test('run', async t => {
	const res = await exec('run')
	t.is(res.stdout, 'foo\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('unresolved promise', async t => {
	const res = await exec('unresolved-promise')
	t.is(res.stdout, 'foo\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 1)
})

test('static api', async t => {
	const res = await exec('static-api')
	t.is(res.stdout, 'foo\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('static api (no options)', async t => {
	const res = await exec('static-api-no-options')
	t.is(res.stdout, 'foo\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('import', async t => {
	const res = await exec('import')
	t.is(res.stdout, 'true\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('force run', async t => {
	const res = await exec('force-run')
	t.is(res.stdout, 'foo\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('force run (import)', async t => {
	const res = await exec('force-run-import')
	t.is(res.stdout, 'foo\nfalse\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('reject', async t => {
	const res = await exec('reject')
	t.is(res.stdout, '')
	t.is(res.stderr, 'bar\n')
	t.is(res.exitCode, 1)
})

test('unhandled rejection', async t => {
	const res = await exec('unhandled-rejection')
	t.is(res.stdout, '')
	t.is(res.stderr, 'bar\n')
	t.is(res.exitCode, 1)
})

test('disable on interrupt', async t => {
	const res = await exec('handle-interrupts', async proc => {
		await new Promise(resolve => {
			proc.on('message', msg => {
				if (msg === 'ready') {
					resolve()
				}
			})
		})
		setTimeout(() => {
			proc.send('sigint')
			proc.send('allow-exit')
		}, 100)
	})
	t.is(res.stdout, 'foo\nbar\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 0)
})

test('exit on second interrupt', async t => {
	const res = await exec('handle-interrupts', async proc => {
		await new Promise(resolve => {
			proc.on('message', msg => {
				if (msg === 'ready') {
					resolve()
				}
			})
		})
		setTimeout(() => {
			proc.send('sigint')
			proc.send('sigint')
			proc.send('allow-exit')
		}, 100)
	})
	t.is(res.stdout, 'foo\n')
	t.is(res.stderr, '')
	t.is(res.exitCode, 1)
})

async function exec(entry, handler) {
	const proc = cp.fork(path.resolve(__dirname, 'cli_impl', entry), {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc']
	})
	let exitCode = 0
	let stdout = ''
	let stderr = ''
	await Promise.all([
		new Promise((resolve, reject) => {
			proc.on('error', reject)
			proc.on('exit', code => {
				exitCode = code
				resolve()
			})
		}),
		new Promise(resolve => {
			proc.stdout.on('end', resolve)
			proc.stdout.on('data', chunk => {
				stdout += chunk
			})
		}),
		new Promise(resolve => {
			proc.stderr.on('end', resolve)
			proc.stderr.on('data', chunk => {
				stderr += chunk
			})
		}),
		handler && handler(proc)
	])
	return {exitCode, stdout, stderr}
}

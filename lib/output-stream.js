'use strict'

function create(ctx, executor) {
    return new Promise((resolveFirst, rejectFirst) => {
        let resolve = v => {
            pushSubsequent()
            resolveFirst(v)
        }
        let reject = v => {
            pushSubsequent()
            rejectFirst(v)
        }
        function pushSubsequent() {
            resolve = v => ctx.push(Promise.resolve(v))
            reject = v => ctx.push(Promise.reject(v))
        }
        try {
            executor(v => resolve(v), v => reject(v))
        } catch (err) {
            reject(err)
        }
    })
}

function outputStream(ctx, executor) {
    return create(ctx, executor)
}

exports.default = outputStream

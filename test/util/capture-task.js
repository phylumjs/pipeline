'use strict'

module.exports = task => {
    const output = []
    task.pipe({push: state => {
        state.then(resolve => {
            output.push({resolve})
        }, reject => {
            output.push({reject})
        })
    }})
    return output
}

# @phylum/pipeline
[![Build Status](https://travis-ci.org/phylumjs/pipeline.svg?branch=master)](https://travis-ci.org/phylumjs/pipeline)
[![Coverage Status](https://coveralls.io/repos/github/phylumjs/pipeline/badge.svg?branch=master)](https://coveralls.io/github/phylumjs/pipeline?branch=master)
[![Latest](https://img.shields.io/npm/v/@phylum/pipeline.svg?label=latest) ![License](https://img.shields.io/npm/l/@phylum/pipeline.svg?label=license)](https://npmjs.org/package/@phylum/pipeline)

This is a preview of the next major version of phylumjs. It is a complete redesign and is written in typescript to address the following problems:
+ The dependency system was to complex.
+ Implementing tasks that push multiple outputs was only possible using two different output types.
+ The order in which task output resolves was not specified.
+ Tasks were only re-executed when required by a dependent.

## Packaged Includes
| Path | Type | Entry Point |
|-|-|-|
| `/dist/node` | ES2017, CommonJS Modules | `main` |
| `/dist/es2015` | ES2015, ES Modules | `browser` |
| `/dist/es2017` | ES2017, ES Modules | |
| `/src` | TypeScript Sources | |

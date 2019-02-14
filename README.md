# @phylum/pipeline
This is a preview of the next major version of phylumjs. It is a complete redesign and is written in typescript to address the following problems:
+ The dependency system was to complex.
+ The dependency system required a unique global pipeline instance.
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

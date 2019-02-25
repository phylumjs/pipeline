<template>
    <div>
        <div class="a-title">
            <b-container class="text-center">
                <b-img :src="header" fluid alt="PhylumJS"/>
                <div class="lead">
                    {{ description }}
                </div>
                <div>
                    <a href="https://travis-ci.org/phylumjs/pipeline" target="_blank">
                        <img src="https://travis-ci.org/phylumjs/pipeline.svg?branch=master">
                    </a>
                    <a href="https://coveralls.io/github/phylumjs/pipeline?branch=master" target="_blank">
                        <img src="https://coveralls.io/repos/github/phylumjs/pipeline/badge.svg?branch=master">
                    </a>
                    <a href="https://www.npmjs.com/package/@phylum/pipeline" target="_blank">
                        <img src="https://img.shields.io/npm/v/@phylum/pipeline.svg">
                        <img src="https://img.shields.io/npm/l/@phylum/pipeline.svg">
                    </a>
                </div>
            </b-container>
        </div>
        <page-content/>
    </div>
</template>

<script>
    import header from '../images/header.png';
    import content from '../..';
    import { description } from '../../../package.json';

    export default {
        components: {'page-content': content},

        created() {
            this.header = header;
            this.description = description;
        }
    }
</script>

<style lang="less" scoped>
    @import 'theme';

    .a-title {
        background-color: @bg-dark;
        color: @fg-dark;
        padding-bottom: 6em;

        .lead {
            margin-bottom: 0.5em;
        }
    }
</style>

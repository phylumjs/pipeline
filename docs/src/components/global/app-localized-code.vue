<template>
	<div>
		<slot :name="current"/>
		<div class="lang-switch">
			<span v-for="lang in langs" :key="lang" :class="{option: true, active: current === lang}" @click="current = lang">
				{{ nameOf(lang) }}
			</span>
		</div>
	</div>
</template>

<style lang="less" scoped>
	.lang-switch {
		position: absolute;
		top: 0;
		right: 0;
		white-space: normal;
		font-size: 0.84em;

		@border: 1px solid rgba(255, 255, 255, 0.2);
		border-bottom-left-radius: 5px;
		border-bottom: @border;
		border-left: @border;

		.option {
			display: inline-block;
			padding: 3px 10px 2px;
			color: rgb(102, 102, 102);
			cursor: pointer;
		}
		.option.active {
			color: rgb(10, 171, 235);
			cursor: default;
		}
		*+.option {
			border-left: @border;
		}
	}
</style>

<script>
	const names = new Map([
		['js', 'NodeJS'],
		['ts', 'TypeScript']
	]);

	export default {
		props: {
			langs: Array
		},

		data() {
			return {
				current: this.langs[0]
			};
		},

		methods: {
			nameOf(lang) {
				return names.get(lang) || lang;
			}
		}
	}
</script>

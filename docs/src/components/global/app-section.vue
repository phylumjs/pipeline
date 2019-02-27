<template>
	<div class="a-section">
		<b-container>
			<slot/>
		</b-container>
	</div>
</template>

<style lang="less" scoped>
	.a-section {
		padding: 3em 0 4em;
		&+& {
			border-top: 1px solid rgb(240, 240, 240);
		}
	}
</style>

<template>
	<div>
		<b-navbar toggleable="sm" type="dark" fixed="top">
			<b-container>
				<b-navbar-toggle target="nav_collapse"/>
				<b-navbar-brand to="/">PhylumJS</b-navbar-brand>
				<b-collapse is-nav id="nav_collapse">
					<b-navbar-nav class="ml-auto">
						<!-- <b-nav-dd text="Manual">
							<b-dd-item to="/manual/tasks">Tasks</b-dd-item>
							<b-dd-item to="/manual/containers">Containers</b-dd-item>
							<b-dd-item to="/manual/events">Events</b-dd-item>
						</b-nav-dd> -->
						<b-nav-item href="https://github.com/phylumjs" target="_blank">GitHub</b-nav-item>
					</b-navbar-nav>
				</b-collapse>
			</b-container>
		</b-navbar>
		<b-navbar><b-navbar-brand><br></b-navbar-brand></b-navbar>
		<router-view/>
	</div>
</template>

<script>
	export default {
		watch: {
			$route() {
				if (window.scrollTo) {
					window.scrollTo(0, 0);
				}
			}
		}
	};
</script>

<style lang="less" scoped>
	@import 'theme';

	.navbar {
		background-color: @bg-dark;
	}
</style>

<style lang="less">
	@import 'document';
</style>

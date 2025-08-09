<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ConsoleWrapper } from '$lib/utils/consoleWrapper.js';

	let { children } = $props();

	// Initialize console forwarding on mount
	onMount(() => {
		const consoleWrapper = new ConsoleWrapper();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

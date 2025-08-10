<script>
	import { goto } from '$app/navigation';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import RegisterForm from '$lib/components/auth/RegisterForm.svelte';
	import { createAuthStore } from '$lib/auth/client.svelte.js';
	
	let showRegister = $state(false);
	const authStore = createAuthStore();
	
	$effect(() => {
		// If user is already logged in, redirect to library
		if (authStore.user) {
			goto('/library');
		}
	});
	
	function handleAuthSuccess() {
		goto('/library');
	}
	
	function toggleForm() {
		showRegister = !showRegister;
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-2">📚 Story Book</h1>
			<p class="text-lg text-gray-600">Learn languages through reading</p>
		</div>
		
		<div class="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
			{#if showRegister}
				<RegisterForm onSuccess={handleAuthSuccess} />
			{:else}
				<LoginForm onSuccess={handleAuthSuccess} />
			{/if}
			
			<div class="mt-6 text-center">
				<button
					onclick={toggleForm}
					class="text-sm text-blue-600 hover:text-blue-500"
				>
					{showRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
				</button>
			</div>
			
			<div class="mt-4 p-4 bg-gray-50 rounded-md">
				<p class="text-sm text-gray-600 text-center">
					<strong>Test Account:</strong><br>
					Email: kyran@storybook.test<br>
					Password: storybook
				</p>
			</div>
		</div>
	</div>
</div>

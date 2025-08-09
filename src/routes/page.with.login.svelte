<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createAuthStore } from '$lib/auth/client.svelte.js';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import RegisterForm from '$lib/components/auth/RegisterForm.svelte';

	let showRegister = $state(false);
	const authStore = createAuthStore();

	onMount(async () => {
		await authStore.init();

		// If user is already authenticated, redirect to app
		if (authStore.isAuthenticated) {
			goto('/app', { replaceState: true });
		}
	});

	function handleLoginSuccess() {
		goto('/app', { replaceState: true });
	}

	function handleRegisterSuccess() {
		goto('/app', { replaceState: true });
	}

	function toggleForm() {
		showRegister = !showRegister;
	}
</script>

<svelte:head>
	<title>My Great Project</title>
	<meta name="description" content="What this project does for the world..." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<div class="flex min-h-screen">
		<!-- Left side - Hero section -->
		<div class="flex w-1/2 flex-col justify-center px-8 lg:px-12">
			<div class="mx-auto max-w-md">
				<div class="text-center">
					<h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">PROJECT_NAME</h1>
					<p class="mt-6 text-lg leading-8 text-gray-600">Project description....</p>
				</div>

				<div class="mt-10">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Key Features:</h3>
					<ul class="space-y-3 text-gray-600">
						<li class="flex items-start">
							<svg
								class="mt-0.5 mr-2 h-6 w-6 flex-shrink-0 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Key feature 1
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 mr-2 h-6 w-6 flex-shrink-0 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Key Feature 2
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 mr-2 h-6 w-6 flex-shrink-0 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Key Feature 3
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 mr-2 h-6 w-6 flex-shrink-0 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Key Feature 4
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Right side - Authentication forms -->
		<div class="flex w-1/2 flex-col justify-center bg-white px-8 py-12 shadow-xl lg:px-12">
			<div class="mx-auto w-full max-w-sm">
				{#if authStore.loading}
					<div class="text-center">
						<div
							class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
						<p class="mt-2 text-gray-600">Checking authentication...</p>
					</div>
				{:else if showRegister}
					<RegisterForm onSuccess={handleRegisterSuccess} />

					<div class="mt-6 text-center">
						<button onclick={toggleForm} class="text-sm text-blue-600 hover:text-blue-500">
							Already have an account? Sign in
						</button>
					</div>
				{:else}
					<LoginForm onSuccess={handleLoginSuccess} />

					<div class="mt-6 text-center">
						<button onclick={toggleForm} class="text-sm text-blue-600 hover:text-blue-500">
							Don't have an account? Sign up
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<script>
	import { createAuthStore } from '$lib/auth/client.svelte.js';

	let { onSuccess = () => {} } = $props();

	// Form state
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	// Auth store
	const authStore = createAuthStore();

	async function handleSubmit() {
		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		error = '';

		const result = await authStore.signIn(email, password);

		if (result.success) {
			onSuccess();
		} else {
			error = result.error;
		}

		loading = false;
	}

	function handleKeyPress(event) {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<div class="w-full max-w-md">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-6"
	>
		<div>
			<h2 class="text-center text-3xl font-bold tracking-tight text-gray-900">
				Sign in to your account
			</h2>
		</div>

		{#if error}
			<div class="rounded-md bg-red-50 p-4">
				<div class="text-sm text-red-700">{error}</div>
			</div>
		{/if}

		<div class="space-y-4">
			<div>
				<label for="email" class="block text-sm leading-6 font-medium text-gray-900">
					Email address
				</label>
				<div class="mt-2">
					<input
						id="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						onkeypress={handleKeyPress}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
						placeholder="Enter your email"
					/>
				</div>
			</div>

			<div>
				<label for="password" class="block text-sm leading-6 font-medium text-gray-900">
					Password
				</label>
				<div class="mt-2">
					<input
						id="password"
						type="password"
						autocomplete="current-password"
						required
						bind:value={password}
						onkeypress={handleKeyPress}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
						placeholder="Enter your password"
					/>
				</div>
			</div>
		</div>

		<div>
			<button
				type="submit"
				disabled={loading}
				class="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{loading ? 'Signing in...' : 'Sign in'}
			</button>
		</div>

		<div class="mt-4 text-center text-sm text-gray-600">
			<p>Test credentials: kyran@geoproj.test / geoprojector</p>
		</div>
	</form>
</div>

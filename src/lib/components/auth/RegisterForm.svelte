<script>
	import { createAuthStore } from '$lib/auth/client.svelte.js';
	
	let { onSuccess = () => {} } = $props();
	
	// Form state
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	
	// Auth store
	const authStore = createAuthStore();
	
	async function handleSubmit() {
		if (!name || !email || !password || !confirmPassword) {
			error = 'Please fill in all fields';
			return;
		}
		
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}
		
		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}
		
		loading = true;
		error = '';
		
		const result = await authStore.signUp(email, password, name);
		
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
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
		<div>
			<h2 class="text-center text-3xl font-bold tracking-tight text-gray-900">
				Create your account
			</h2>
		</div>
		
		{#if error}
			<div class="rounded-md bg-red-50 p-4">
				<div class="text-sm text-red-700">{error}</div>
			</div>
		{/if}
		
		<div class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium leading-6 text-gray-900">
					Full name
				</label>
				<div class="mt-2">
					<input
						id="name"
						type="text"
						autocomplete="name"
						required
						bind:value={name}
						onkeypress={handleKeyPress}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
						placeholder="Enter your full name"
					/>
				</div>
			</div>
			
			<div>
				<label for="email" class="block text-sm font-medium leading-6 text-gray-900">
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
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
						placeholder="Enter your email"
					/>
				</div>
			</div>
			
			<div>
				<label for="password" class="block text-sm font-medium leading-6 text-gray-900">
					Password
				</label>
				<div class="mt-2">
					<input
						id="password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={password}
						onkeypress={handleKeyPress}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
						placeholder="Create a password"
					/>
				</div>
			</div>
			
			<div>
				<label for="confirm-password" class="block text-sm font-medium leading-6 text-gray-900">
					Confirm password
				</label>
				<div class="mt-2">
					<input
						id="confirm-password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						onkeypress={handleKeyPress}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
						placeholder="Confirm your password"
					/>
				</div>
			</div>
		</div>
		
		<div>
			<button
				type="submit"
				disabled={loading}
				class="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Creating account...' : 'Create account'}
			</button>
		</div>
	</form>
</div>
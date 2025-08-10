<script>
	import { goto } from '$app/navigation';
	import { createAuthStore } from '$lib/auth/client.svelte.js';
	import { SUPPORTED_LANGUAGES } from '$lib/services/translation.js';
	import { LANGUAGES, READING_MODES } from '$lib/constants/languages.js';
	
	let { data } = $props();
	
	const authStore = createAuthStore();
	let selectedLanguage = $state('fr');
	let selectedLanguages = $state(['fr']);
	let selectedReadingMode = $state('paragraph');
	let showLanguageModal = $state(false);
	let selectedBookId = $state(null);
	
	// Initialize auth on mount
	$effect(() => {
		authStore.init();
	});
	
	// Redirect if not authenticated
	$effect(() => {
		if (!authStore.loading && !authStore.isAuthenticated) {
			goto('/');
		}
	});
	
	function selectBook(bookId) {
		selectedBookId = bookId;
		showLanguageModal = true;
	}
	
	async function startReading() {
		if (!selectedBookId) return;
		
		// Determine which languages to use based on reading mode
		const languages = selectedReadingMode === 'sentence' ? selectedLanguages : [selectedLanguage];
		if (languages.length === 0) return;
		
		// Create a reading session via API
		const response = await fetch('/api/sessions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				bookId: selectedBookId,
				language: languages[0], // Primary language for backwards compatibility
				languages: languages,
				readingMode: selectedReadingMode
			})
		});
		
		if (response.ok) {
			const { sessionId } = await response.json();
			goto(`/read/${sessionId}`);
		}
	}
	
	function toggleLanguage(langCode) {
		if (selectedLanguages.includes(langCode)) {
			selectedLanguages = selectedLanguages.filter(l => l !== langCode);
		} else {
			selectedLanguages = [...selectedLanguages, langCode];
		}
	}
	
	function handleSignOut() {
		authStore.signOut();
		goto('/');
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:h-16 gap-2 sm:gap-0">
				<div class="flex items-center">
					<h1 class="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
						<span class="inline sm:hidden">📚 Story Book</span>
						<span class="hidden sm:inline">📚 Story Book Library</span>
					</h1>
				</div>
				<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
					{#if authStore.user}
						<span class="text-xs sm:text-sm text-gray-600 truncate max-w-[200px] sm:max-w-none">
							Welcome, {authStore.user.name || authStore.user.email}
						</span>
						<button
							onclick={handleSignOut}
							class="text-xs sm:text-sm text-gray-500 hover:text-gray-700 self-start sm:self-auto"
						>
							Sign Out
						</button>
					{/if}
				</div>
			</div>
		</div>
	</header>
	
	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if authStore.loading}
			<div class="flex justify-center items-center h-64">
				<div class="text-gray-500">Loading...</div>
			</div>
		{:else}
			<!-- Recent Sessions -->
			{#if data?.sessions && data.sessions.length > 0}
				<section class="mb-8">
					<h2 class="text-xl font-semibold text-gray-900 mb-4">Continue Reading</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each data.sessions as session}
							<a
								href="/read/{session.id}"
								class="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
							>
								<h3 class="font-semibold text-gray-900">{session.title}</h3>
								<p class="text-sm text-gray-600 mt-1">by {session.author}</p>
								<p class="text-sm text-gray-500 mt-2">
									Language: {SUPPORTED_LANGUAGES[session.language] || session.language}
								</p>
								<p class="text-sm text-gray-500">
									Page {session.current_page} of {session.total_pages || '?'}
								</p>
							</a>
						{/each}
					</div>
				</section>
			{/if}
			
			<!-- Available Books -->
			<section>
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Available Books</h2>
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{#if data?.books}
						{#each data.books as book}
							<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
								<button
									onclick={() => selectBook(book.id)}
									class="w-full text-left p-3"
								>
									<div class="w-full max-w-[200px] aspect-[2/3] mb-3 mx-auto rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
										{#if book.cover_image_path}
											<img 
												src={book.cover_image_path} 
												alt="Cover of {book.title}"
												class="w-full h-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="bg-gradient-to-br from-blue-400 to-purple-600 w-full h-full flex items-center justify-center">
												<span class="text-white text-2xl sm:text-3xl md:text-4xl">📖</span>
											</div>
										{/if}
									</div>
									<div class="w-full max-w-[200px] mx-auto">
										<h3 class="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 mb-1">{book.title}</h3>
										<p class="text-xs text-gray-600 mb-1">{book.author}</p>
										<p class="text-xs text-gray-500">{book.total_pages} pages</p>
									</div>
								</button>
							</div>
						{/each}
					{:else}
						<div class="col-span-full text-center py-12 text-gray-500">
							No books available. Please run the book download script.
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</main>
	
	<!-- Language Selection Modal -->
	{#if showLanguageModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Reading Settings</h3>
				
				<!-- Reading Mode Selection -->
				<div class="mb-6">
					<h4 class="text-sm font-medium text-gray-700 mb-3">Reading Mode</h4>
					<div class="space-y-2">
						{#each Object.entries(READING_MODES) as [mode, label]}
							<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									bind:group={selectedReadingMode}
									value={mode}
									class="mr-3"
								/>
								<div>
									<span class="font-medium">{label}</span>
									<p class="text-xs text-gray-500 mt-1">
										{mode === 'paragraph' ? 'Read complete paragraphs with single language translation' : 'Read sentence by sentence with multiple simultaneous translations'}
									</p>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Language Selection -->
				<div class="mb-6">
					<h4 class="text-sm font-medium text-gray-700 mb-3">
						{selectedReadingMode === 'paragraph' ? 'Translation Language' : 'Translation Languages'}
					</h4>
					
					{#if selectedReadingMode === 'paragraph'}
						<!-- Single language selection for paragraph mode -->
						<div class="space-y-2">
							{#each Object.entries(LANGUAGES) as [code, lang]}
								<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										bind:group={selectedLanguage}
										value={code}
										class="mr-3"
									/>
									<span>{lang.name}</span>
								</label>
							{/each}
						</div>
					{:else}
						<!-- Multiple language selection for sentence mode -->
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(LANGUAGES) as [code, lang]}
								<label class="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="checkbox"
										checked={selectedLanguages.includes(code)}
										onchange={() => toggleLanguage(code)}
										class="mr-2"
									/>
									<div class="flex items-center space-x-2">
										<span class="text-xs px-2 py-1 rounded {lang.bgColor} {lang.textColor} {lang.borderColor} border">
											{lang.iso}
										</span>
										<span class="text-sm">{lang.name}</span>
									</div>
								</label>
							{/each}
						</div>
						
						{#if selectedLanguages.length === 0}
							<p class="text-sm text-red-600 mt-2">Please select at least one language for sentence mode.</p>
						{/if}
					{/if}
				</div>
				
				<div class="flex justify-end space-x-3 mt-6">
					<button
						onclick={() => showLanguageModal = false}
						class="px-4 py-2 text-gray-600 hover:text-gray-800"
					>
						Cancel
					</button>
					<button
						onclick={startReading}
						disabled={selectedReadingMode === 'sentence' && selectedLanguages.length === 0}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						Start Reading
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
<script>
	import { createReadingStore } from '$lib/stores/reading.svelte.js';
	import AudioController from '$lib/components/reading/AudioController.svelte';
	import ReadingHeader from '$lib/components/reading/ReadingHeader.svelte';
	import NavigationControls from '$lib/components/reading/NavigationControls.svelte';
	import SentenceModeView from '$lib/components/reading/SentenceModeView.svelte';
	import ParagraphModeView from '$lib/components/reading/ParagraphModeView.svelte';
	
	let { data } = $props();
	
	// Create the reading store with initial data
	const store = createReadingStore(data);
	
	// Audio controller reference
	let audioController = $state(null);
	
	// Load translation when page content changes
	async function loadTranslation() {
		if (!store.pageContent?.content || !data.session) return;
		
		store.isLoading = true;
		
		try {
			if (store.readingMode === 'paragraph') {
				// Single language translation for paragraph mode
				const response = await fetch('/api/translate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						bookId: data.session.book_id,
						pageNumber: store.currentPage,
						originalText: store.pageContent.content,
						language: store.primaryLanguage,
						includePhonetic: true,
						includeAudio: true
					})
				});
				
				if (response.ok) {
					const result = await response.json();
					store.translatedText = result.translatedText;
					store.phoneticText = result.phoneticText || '';
					store.audioPath = result.audioPath;
				} else {
					console.error('Failed to translate:', await response.text());
				}
			} else {
				// Multiple language translations for sentence mode
				const response = await fetch('/api/translate-multiple', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						bookId: data.session.book_id,
						pageNumber: store.currentPage,
						originalText: store.pageContent.content,
						languages: store.languages,
						includePhonetic: true,
						includeAudio: true
					})
				});
				
				if (response.ok) {
					const result = await response.json();
					store.multipleTranslations = result.translations;
				} else {
					console.error('Failed to translate:', response.status, await response.text());
				}
			}
		} catch (error) {
			console.error('Failed to load translation:', error);
		} finally {
			store.isLoading = false;
		}
	}
	
	// Handle page changes
	function handlePageChange(newPage) {
		// This is called by NavigationControls after successful page change
		// Store is already updated by the NavigationControls component
	}
	
	// Handle reading mode toggle
	function handleReadingModeToggle() {
		// Reload the page to apply the new reading mode
		window.location.reload();
	}
</script>

<!-- Audio Controller (invisible) -->
<AudioController 
	bind:this={audioController}
	{store}
	sessionData={data}
	onLoadTranslation={loadTranslation}
/>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<ReadingHeader 
		{store}
		sessionData={data}
		onToggleReadingMode={handleReadingModeToggle}
	/>
	
	<!-- Reading Interface -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if store.isLoading}
			<div class="flex justify-center items-center h-64">
				<div class="text-gray-500">Loading translation...</div>
			</div>
		{:else if store.readingMode === 'sentence'}
			<SentenceModeView {store} />
		{:else}
			<ParagraphModeView {store} />
		{/if}
	</main>
	
	<!-- Navigation Controls -->
	<NavigationControls 
		{store}
		sessionData={data}
		onChangePage={handlePageChange}
	/>
</div>
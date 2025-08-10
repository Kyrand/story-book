<script>
	import { getContext } from 'svelte';
	import { SUPPORTED_LANGUAGES } from '$lib/services/translation.js';
	import { LANGUAGES } from '$lib/constants/languages.js';
	
	let { 
		store,
		sessionData,
		onToggleReadingMode = () => {}
	} = $props();
	
	// Get audio controller from context
	const audioController = getContext('audioController');
	const playAudio = audioController?.playAudio;
	
	async function toggleReadingMode() {
		const newMode = store.readingMode === 'paragraph' ? 'sentence' : 'paragraph';
		
		try {
			// Update the reading session mode in the database
			const response = await fetch(`/api/sessions/${sessionData.session.id}/reading-mode`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ readingMode: newMode })
			});
			
			if (response.ok) {
				// Call parent handler
				onToggleReadingMode();
			} else {
				console.error('Failed to update reading mode:', await response.text());
			}
		} catch (error) {
			console.error('Error updating reading mode:', error);
		}
	}
</script>

<header class="bg-white shadow-sm border-b sticky top-0 z-10">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:h-16 gap-2 sm:gap-0">
			<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
				<a href="/library" class="text-sm sm:text-base text-gray-600 hover:text-gray-900">
					← Back
				</a>
				<span class="hidden sm:inline text-gray-400">|</span>
				<div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
					<span class="font-semibold text-sm sm:text-base truncate max-w-[250px] sm:max-w-none">
						{sessionData.session?.title}
					</span>
					<span class="text-xs sm:text-sm text-gray-500">
						{SUPPORTED_LANGUAGES[sessionData.session?.language]}
					</span>
				</div>
			</div>
			
			<div class="flex items-center gap-2 sm:gap-4">
				<!-- Reading Mode Toggle -->
				<button
					onclick={toggleReadingMode}
					class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md border-2 transition-colors {store.readingMode === 'sentence' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-orange-100 text-orange-700 border-orange-300'} hover:opacity-80"
					title="Switch between paragraph and sentence reading modes"
				>
					<span class="sm:hidden">{store.readingMode === 'sentence' ? '📝' : '📄'}</span>
					<span class="hidden sm:inline">{store.readingMode === 'sentence' ? '📝 Sentence' : '📄 Paragraph'}</span>
				</button>
				
				<button
					onclick={store.togglePhonetic}
					class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md {store.showPhonetic ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700'}"
					title="Toggle phonetic guide"
				>
					<span class="sm:hidden">🗣️</span>
					<span class="hidden sm:inline">🗣️ Phonetic</span>
					{#if store.showPhonetic}<span class="text-xs">(ON)</span>{/if}
				</button>
				
				<!-- Test highlighting button (temporary) -->
				<button
					onclick={store.toggleTestMode}
					class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md {store.testHighlighting ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-700'}"
					title="Test highlighting"
				>
					🧪 Test
					{#if store.testHighlighting}<span class="text-xs">(ON)</span>{/if}
				</button>
				
				<!-- Language selector for sentence mode audio -->
				{#if store.readingMode === 'sentence' && Object.keys(store.multipleTranslations).length > 1}
					<select 
						bind:value={store.selectedAudioLanguage}
						class="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 border border-gray-300"
						title="Select audio language"
					>
						{#each Object.keys(store.multipleTranslations) as lang}
							<option value={lang}>{LANGUAGES[lang]?.name || lang.toUpperCase()}</option>
						{/each}
					</select>
				{/if}
				
				<div class="relative">
					<button
						onclick={playAudio}
						disabled={store.isLoading || (store.readingMode === 'paragraph' && !store.audioPath) || (store.readingMode === 'sentence' && (!store.selectedAudioLanguage || !store.multipleTranslations[store.selectedAudioLanguage]?.audioPath))}
						class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-green-100 text-green-700 disabled:opacity-50 flex items-center gap-1 relative overflow-hidden"
						title="Play audio for entire page"
					>
						{#if store.isPlaying && !store.playingSentenceIndex && store.audioProgress > 0}
							<div 
								class="absolute inset-0 bg-green-200 opacity-30 transition-all duration-300 ease-out"
								style="width: {store.audioProgress * 100}%"
							></div>
						{/if}
						<span class="relative z-10 flex items-center gap-1">
							{store.isPlaying && !store.playingSentenceIndex ? '⏸️' : '▶️'}
							<span class="hidden sm:inline"> Audio</span>
							{#if store.readingMode === 'sentence' && store.selectedAudioLanguage}
								<span class="text-xs opacity-75">({LANGUAGES[store.selectedAudioLanguage]?.iso || store.selectedAudioLanguage.toUpperCase()})</span>
							{/if}
							{#if store.loadingSentenceAudio}
								<span class="text-xs opacity-75" title="Pre-loading sentence audio...">⏳</span>
							{/if}
						</span>
					</button>
				</div>
				
				<span class="text-xs sm:text-sm text-gray-500">
					{store.currentPage}/{store.pageContent?.totalPages || '?'}
				</span>
			</div>
		</div>
	</div>
</header>
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { SUPPORTED_LANGUAGES } from '$lib/services/translation.js';
	import { LANGUAGES } from '$lib/constants/languages.js';
	import { splitIntoSentences } from '$lib/services/books.js';
	
	let { data } = $props();
	
	// Parse reading session data
	const readingMode = data.session?.reading_mode || 'paragraph';
	const languages = data.session?.languages ? JSON.parse(data.session.languages) : [data.session?.language];
	const primaryLanguage = data.session?.language;
	
	
	let currentPage = $state(data.session?.current_page || 1);
	let pageContent = $state(data.pageContent);
	let translatedText = $state(''); // For paragraph mode
	let phoneticText = $state(''); // For paragraph mode
	let audioPath = $state(''); // For paragraph mode
	let multipleTranslations = $state({});
	
	// For sentence mode: {lang: {translatedText, phoneticText, audioPath}}
	let isLoading = $state(false);
	let showPhonetic = $state(false);
	let selectedSentenceIndex = $state(null);
	let isPlaying = $state(false);
	let audioElement = $state(null);
	
	// Split content into sentences for highlighting
	let originalSentences = $derived(splitIntoSentences(pageContent?.content || ''));
	let translatedSentences = $derived(splitIntoSentences(translatedText)); // For paragraph mode
	let phoneticSentences = $derived(splitIntoSentences(phoneticText)); // For paragraph mode
	
	// For sentence mode: split translations for each language
	let multipleTranslatedSentences = $derived(() => {
		// Add simple debug - check if we have translations
		if (Object.keys(multipleTranslations).length === 0) {
			return {};
		}
		
		const result = {};
		for (const lang of languages) {
			if (multipleTranslations[lang] && multipleTranslations[lang].translatedText) {
				result[lang] = {
					translated: splitIntoSentences(multipleTranslations[lang].translatedText),
					phonetic: splitIntoSentences(multipleTranslations[lang].phoneticText || '')
				};
			}
		}
		return result;
	});
	
	// Check if screen is mobile size
	let isMobile = $state(false);
	
	$effect(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});
	
	// Load translation when page changes
	$effect(() => {
		if (pageContent) {
			loadTranslation();
		}
	});
	
	async function loadTranslation() {
		if (!pageContent?.content || !data.session) return;
		
		isLoading = true;
		
		try {
			if (readingMode === 'paragraph') {
				// Single language translation for paragraph mode
				const response = await fetch('/api/translate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						bookId: data.session.book_id,
						pageNumber: currentPage,
						originalText: pageContent.content,
						language: primaryLanguage,
						includePhonetic: true,
						includeAudio: true
					})
				});
				
				if (response.ok) {
					const result = await response.json();
					translatedText = result.translatedText;
					phoneticText = result.phoneticText || '';
					audioPath = result.audioPath;
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
						pageNumber: currentPage,
						originalText: pageContent.content,
						languages: languages,
						includePhonetic: true,
						includeAudio: true
					})
				});
				
				if (response.ok) {
					const result = await response.json();
					multipleTranslations = result.translations;
				} else {
					console.error('Failed to translate:', response.status, await response.text());
				}
			}
		} catch (error) {
			console.error('Failed to load translation:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function changePage(direction) {
		const newPage = currentPage + direction;
		
		if (newPage < 1 || newPage > pageContent.totalPages) return;
		
		currentPage = newPage;
		
		// Load new page content
		const response = await fetch(`/api/books/${data.session.book_id}/page/${newPage}`);
		if (response.ok) {
			pageContent = await response.json();
			
			// Update session progress
			await fetch(`/api/sessions/${data.session.id}/progress`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPage: newPage })
			});
		}
	}
	
	function selectSentence(index) {
		selectedSentenceIndex = selectedSentenceIndex === index ? null : index;
	}
	
	async function playAudio() {
		if (!audioPath) return;
		
		if (isPlaying && audioElement) {
			audioElement.pause();
			isPlaying = false;
			return;
		}
		
		try {
			if (!audioElement) {
				audioElement = new Audio(`/api/audio/${audioPath}`);
				audioElement.addEventListener('ended', () => {
					isPlaying = false;
				});
			}
			
			await audioElement.play();
			isPlaying = true;
		} catch (error) {
			console.error('Failed to play audio:', error);
		}
	}
	
	function togglePhonetic() {
		showPhonetic = !showPhonetic;
		// No need to reload - phonetic text is always loaded
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
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
							{data.session?.title}
						</span>
						<span class="text-xs sm:text-sm text-gray-500">
							{SUPPORTED_LANGUAGES[data.session?.language]}
						</span>
					</div>
				</div>
				
				<div class="flex items-center gap-2 sm:gap-4">
					<button
						onclick={togglePhonetic}
						class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md {showPhonetic ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700'}"
						title="Toggle phonetic guide"
					>
						<span class="sm:hidden">🗣️</span>
						<span class="hidden sm:inline">🗣️ Phonetic</span>
						{#if showPhonetic}<span class="text-xs">(ON)</span>{/if}
					</button>
					
					<button
						onclick={playAudio}
						disabled={!audioPath || isLoading}
						class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-green-100 text-green-700 disabled:opacity-50"
						title="Play audio"
					>
						{isPlaying ? '⏸️' : '▶️'}
						<span class="hidden sm:inline"> Audio</span>
					</button>
					
					<span class="text-xs sm:text-sm text-gray-500">
						{currentPage}/{pageContent?.totalPages || '?'}
					</span>
				</div>
			</div>
		</div>
	</header>
	
	<!-- Reading Interface -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if isLoading}
			<div class="flex justify-center items-center h-64">
				<div class="text-gray-500">Loading translation...</div>
			</div>
		{:else if readingMode === 'sentence'}
			<!-- Debug info -->
			{#if Object.keys(multipleTranslations).length === 0}
				<div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
					<p class="text-sm text-yellow-800">🔄 Loading translations for {languages.join(', ')}...</p>
				</div>
			{:else}
				<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded">
					<p class="text-sm text-green-800">✅ Loaded translations for {Object.keys(multipleTranslations).join(', ')}</p>
				</div>
			{/if}
			
			<!-- Sentence Mode: Horizontal stacking with colored chips -->
			<div class="space-y-6">
				{#each originalSentences as sentence, index}
					<div class="bg-white rounded-lg shadow-sm p-6">
						<!-- Original sentence -->
						<button
							onclick={() => selectSentence(index)}
							class="text-left w-full p-4 rounded-lg transition-colors mb-4
								{selectedSentenceIndex === index ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-gray-50 border border-gray-200'}"
						>
							<div class="flex items-center gap-2 mb-2">
								<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300">
									ENG
								</span>
								<span class="text-xs text-gray-500">Original</span>
							</div>
							<p class="text-lg leading-relaxed">{sentence}</p>
						</button>
						
						<!-- Translation sentences stacked horizontally -->
						<div class="space-y-3">
							{#each languages as lang}
								{#if multipleTranslatedSentences[lang]?.translated[index]}
									<button
										onclick={() => selectSentence(index)}
										class="text-left w-full p-4 rounded-lg transition-colors
											{selectedSentenceIndex === index ? `${LANGUAGES[lang].bgColor} border-2 ${LANGUAGES[lang].borderColor}` : 'hover:bg-gray-50 border border-gray-200'}"
									>
										<div class="flex items-center gap-2 mb-2">
											<span class="text-xs px-2 py-1 rounded {LANGUAGES[lang].bgColor} {LANGUAGES[lang].textColor} border {LANGUAGES[lang].borderColor}">
												{LANGUAGES[lang].iso}
											</span>
											<span class="text-xs text-gray-500">{LANGUAGES[lang].name}</span>
										</div>
										<p class="text-lg leading-relaxed">
											{multipleTranslatedSentences[lang].translated[index]}
										</p>
										{#if showPhonetic && multipleTranslatedSentences[lang].phonetic[index]}
											<p class="text-sm text-gray-500 mt-2 italic">
												{multipleTranslatedSentences[lang].phonetic[index]}
											</p>
										{/if}
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else if isMobile}
			<!-- Paragraph Mode - Mobile: Interlaced Layout -->
			<div class="space-y-4">
				{#each originalSentences as sentence, index}
					<div class="space-y-2">
						<button
							onclick={() => selectSentence(index)}
							class="text-left w-full p-4 rounded-lg transition-colors
								{selectedSentenceIndex === index ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white'}"
						>
							<p class="text-lg leading-relaxed">{sentence}</p>
						</button>
						
						{#if translatedSentences[index]}
							<div class="pl-4 border-l-4 border-gray-300">
								<button
									onclick={() => selectSentence(index)}
									class="text-left w-full p-4 rounded-lg transition-colors
										{selectedSentenceIndex === index ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}"
								>
									<p class="text-lg leading-relaxed text-gray-700">
										{translatedSentences[index]}
									</p>
									{#if showPhonetic && phoneticSentences[index]}
										<p class="text-sm text-gray-500 mt-2 italic">
											{phoneticSentences[index]}
										</p>
									{/if}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<!-- Paragraph Mode - Desktop: Side-by-side Layout -->
			<div class="grid grid-cols-2 gap-8">
				<!-- Original Text -->
				<div class="bg-white rounded-lg shadow-sm p-6">
					<h3 class="font-semibold text-gray-700 mb-4">Original (English)</h3>
					<div class="space-y-2">
						{#each originalSentences as sentence, index}
							<button
								onclick={() => selectSentence(index)}
								class="text-left w-full p-3 rounded transition-colors
									{selectedSentenceIndex === index ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-gray-50'}"
							>
								<p class="text-lg leading-relaxed">{sentence}</p>
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Translated Text -->
				<div class="bg-white rounded-lg shadow-sm p-6">
					<h3 class="font-semibold text-gray-700 mb-4">
						{SUPPORTED_LANGUAGES[primaryLanguage]} Translation
					</h3>
					<div class="space-y-2">
						{#each translatedSentences as sentence, index}
							<button
								onclick={() => selectSentence(index)}
								class="text-left w-full p-3 rounded transition-colors
									{selectedSentenceIndex === index ? 'bg-green-50 border-2 border-green-300' : 'hover:bg-gray-50'}"
							>
								<p class="text-lg leading-relaxed">{sentence}</p>
								{#if showPhonetic && phoneticSentences[index]}
									<p class="text-sm text-gray-500 mt-1 italic">
										{phoneticSentences[index]}
									</p>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</main>
	
	<!-- Navigation Controls -->
	<div class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
			<div class="flex justify-between items-center">
				<!-- Left navigation zone -->
				<button
					onclick={() => changePage(-1)}
					disabled={currentPage <= 1}
					class="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<span class="hidden sm:inline">← Previous Page</span>
					<span class="sm:hidden">← Prev</span>
				</button>
				
				<!-- Page indicator -->
				<div class="text-center">
					<span class="text-xs sm:text-sm text-gray-600">
						{currentPage} / {pageContent?.totalPages || '?'}
					</span>
				</div>
				
				<!-- Right navigation zone -->
				<button
					onclick={() => changePage(1)}
					disabled={currentPage >= (pageContent?.totalPages || 0)}
					class="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<span class="hidden sm:inline">Next Page →</span>
					<span class="sm:hidden">Next →</span>
				</button>
			</div>
		</div>
	</div>
	
	<!-- Add padding to prevent content from being hidden behind fixed navigation -->
	<div class="h-20"></div>
</div>
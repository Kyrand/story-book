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
	let selectedAudioLanguage = $state(''); // For sentence mode audio language selection
	let playingSentenceIndex = $state(null); // Track which sentence is playing
	let sentenceAudioPaths = $state({}); // Cache audio paths for sentences: {lang: {sentenceIndex: audioPath}}
	let loadingSentenceAudio = $state(false); // Track if we're pre-loading sentence audio
	
	// Split content into sentences for highlighting
	let originalSentences = $derived(splitIntoSentences(pageContent?.content || ''));
	let translatedSentences = $derived(splitIntoSentences(translatedText)); // For paragraph mode
	let phoneticSentences = $derived(splitIntoSentences(phoneticText)); // For paragraph mode
	
	// For sentence mode: split translations for each language
	let multipleTranslatedSentences = $state({});
	
	// Effect to update translated sentences when translations change
	$effect(() => {
		if (Object.keys(multipleTranslations).length === 0) {
			multipleTranslatedSentences = {};
			return;
		}
		
		const result = {};
		
		// Process each available translation language
		for (const lang of Object.keys(multipleTranslations)) {
			if (multipleTranslations[lang] && multipleTranslations[lang].translatedText) {
				const translatedSentences = splitIntoSentences(multipleTranslations[lang].translatedText);
				const phoneticSentences = splitIntoSentences(multipleTranslations[lang].phoneticText || '');
				
				result[lang] = {
					translated: translatedSentences,
					phonetic: phoneticSentences
				};
			}
		}
		
		multipleTranslatedSentences = result;
	});
	
	// Effect to set default audio language when translations change
	$effect(() => {
		if (readingMode === 'sentence' && Object.keys(multipleTranslations).length > 0) {
			// Set to first available language if not already set
			if (!selectedAudioLanguage || !multipleTranslations[selectedAudioLanguage]) {
				selectedAudioLanguage = Object.keys(multipleTranslations)[0];
			}
			
			// Pre-load sentence audio in background for better performance
			preloadSentenceAudio();
		}
	});
	
	// Pre-load audio for all sentences to improve performance
	async function preloadSentenceAudio() {
		if (loadingSentenceAudio) return; // Already loading
		
		loadingSentenceAudio = true;
		const newAudioPaths = {};
		
		try {
			// Pre-load for each available language
			for (const lang of Object.keys(multipleTranslations)) {
				newAudioPaths[lang] = {};
				
				// Generate audio for each sentence in parallel (but limit concurrency)
				const sentencePromises = originalSentences.map(async (sentence, index) => {
					try {
						const response = await fetch('/api/translate', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								bookId: data.session.book_id,
								pageNumber: `${currentPage}_sentence_${index}`,
								originalText: sentence,
								language: lang,
								includePhonetic: false,
								includeAudio: true
							})
						});
						
						if (response.ok) {
							const result = await response.json();
							if (result.audioPath) {
								newAudioPaths[lang][index] = result.audioPath;
							}
						}
					} catch (error) {
						console.warn(`Failed to pre-load audio for sentence ${index} in ${lang}:`, error);
					}
				});
				
				// Process sentences in batches of 3 to avoid overwhelming the server
				const batchSize = 3;
				for (let i = 0; i < sentencePromises.length; i += batchSize) {
					const batch = sentencePromises.slice(i, i + batchSize);
					await Promise.all(batch);
				}
			}
			
			sentenceAudioPaths = newAudioPaths;
		} catch (error) {
			console.error('Failed to pre-load sentence audio:', error);
		} finally {
			loadingSentenceAudio = false;
		}
	}
	
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
		let currentAudioPath = '';
		
		// Determine audio path based on reading mode
		if (readingMode === 'paragraph') {
			currentAudioPath = audioPath;
		} else if (readingMode === 'sentence' && selectedAudioLanguage && multipleTranslations[selectedAudioLanguage]) {
			currentAudioPath = multipleTranslations[selectedAudioLanguage].audioPath;
		}
		
		if (!currentAudioPath) return;
		
		if (isPlaying && audioElement) {
			audioElement.pause();
			isPlaying = false;
			playingSentenceIndex = null; // Clear any sentence-level playing state
			return;
		}
		
		try {
			// Create new audio element or update source if needed
			if (!audioElement || audioElement.src !== `/api/audio/${currentAudioPath}`) {
				if (audioElement) {
					audioElement.pause();
				}
				audioElement = new Audio(`/api/audio/${currentAudioPath}`);
				audioElement.addEventListener('ended', () => {
					isPlaying = false;
				});
			}
			
			await audioElement.play();
			isPlaying = true;
			playingSentenceIndex = null; // Clear sentence-level playing state for page-level audio
		} catch (error) {
			console.error('Failed to play audio:', error);
		}
	}
	
	async function playSentenceAudio(sentenceIndex, language) {
		if (playingSentenceIndex === sentenceIndex && isPlaying) {
			// Stop current playback
			if (audioElement) {
				audioElement.pause();
				isPlaying = false;
				playingSentenceIndex = null;
			}
			return;
		}
		
		// Check if we have pre-loaded audio for this sentence
		const preloadedPath = sentenceAudioPaths[language]?.[sentenceIndex];
		
		if (preloadedPath) {
			// Use pre-loaded audio for instant playback
			try {
				// Stop any current audio
				if (audioElement) {
					audioElement.pause();
				}
				
				// Create new audio element for this sentence
				audioElement = new Audio(`/api/audio/${preloadedPath}`);
				audioElement.addEventListener('ended', () => {
					isPlaying = false;
					playingSentenceIndex = null;
				});
				
				await audioElement.play();
				isPlaying = true;
				playingSentenceIndex = sentenceIndex;
				return;
			} catch (error) {
				console.error('Failed to play pre-loaded sentence audio:', error);
			}
		}
		
		// Fallback: Generate audio on-demand if not pre-loaded
		const originalSentence = originalSentences[sentenceIndex];
		if (!originalSentence) return;
		
		try {
			const response = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookId: data.session.book_id,
					pageNumber: `${currentPage}_sentence_${sentenceIndex}`,
					originalText: originalSentence,
					language: language,
					includePhonetic: false,
					includeAudio: true
				})
			});
			
			if (response.ok) {
				const result = await response.json();
				if (result.audioPath) {
					// Cache this for future use
					if (!sentenceAudioPaths[language]) {
						sentenceAudioPaths[language] = {};
					}
					sentenceAudioPaths[language][sentenceIndex] = result.audioPath;
					
					// Stop any current audio
					if (audioElement) {
						audioElement.pause();
					}
					
					// Create new audio element for this sentence
					audioElement = new Audio(`/api/audio/${result.audioPath}`);
					audioElement.addEventListener('ended', () => {
						isPlaying = false;
						playingSentenceIndex = null;
					});
					
					await audioElement.play();
					isPlaying = true;
					playingSentenceIndex = sentenceIndex;
				}
			}
		} catch (error) {
			console.error('Failed to play sentence audio:', error);
		}
	}
	
	async function toggleReadingMode() {
		const newMode = readingMode === 'paragraph' ? 'sentence' : 'paragraph';
		
		try {
			// Update the reading session mode in the database
			const response = await fetch(`/api/sessions/${data.session.id}/reading-mode`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ readingMode: newMode })
			});
			
			if (response.ok) {
				// Reload the page to apply the new reading mode
				window.location.reload();
			} else {
				console.error('Failed to update reading mode:', await response.text());
			}
		} catch (error) {
			console.error('Error updating reading mode:', error);
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
					<!-- Reading Mode Toggle -->
					<button
						onclick={toggleReadingMode}
						class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md border-2 transition-colors {readingMode === 'sentence' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-orange-100 text-orange-700 border-orange-300'} hover:opacity-80"
						title="Switch between paragraph and sentence reading modes"
					>
						<span class="sm:hidden">{readingMode === 'sentence' ? '📝' : '📄'}</span>
						<span class="hidden sm:inline">{readingMode === 'sentence' ? '📝 Sentence' : '📄 Paragraph'}</span>
					</button>
					
					<button
						onclick={togglePhonetic}
						class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md {showPhonetic ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700'}"
						title="Toggle phonetic guide"
					>
						<span class="sm:hidden">🗣️</span>
						<span class="hidden sm:inline">🗣️ Phonetic</span>
						{#if showPhonetic}<span class="text-xs">(ON)</span>{/if}
					</button>
					
					<!-- Language selector for sentence mode audio -->
					{#if readingMode === 'sentence' && Object.keys(multipleTranslations).length > 1}
						<select 
							bind:value={selectedAudioLanguage}
							class="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 border border-gray-300"
							title="Select audio language"
						>
							{#each Object.keys(multipleTranslations) as lang}
								<option value={lang}>{LANGUAGES[lang]?.name || lang.toUpperCase()}</option>
							{/each}
						</select>
					{/if}
					
					<button
						onclick={playAudio}
						disabled={isLoading || (readingMode === 'paragraph' && !audioPath) || (readingMode === 'sentence' && (!selectedAudioLanguage || !multipleTranslations[selectedAudioLanguage]?.audioPath))}
						class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-green-100 text-green-700 disabled:opacity-50 flex items-center gap-1"
						title="Play audio for entire page"
					>
						{isPlaying && !playingSentenceIndex ? '⏸️' : '▶️'}
						<span class="hidden sm:inline"> Audio</span>
						{#if readingMode === 'sentence' && selectedAudioLanguage}
							<span class="text-xs opacity-75">({LANGUAGES[selectedAudioLanguage]?.iso || selectedAudioLanguage.toUpperCase()})</span>
						{/if}
						{#if loadingSentenceAudio}
							<span class="text-xs opacity-75" title="Pre-loading sentence audio...">⏳</span>
						{/if}
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
									<div class="relative">
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
										
										<!-- Individual sentence audio button -->
										<button
											onclick={(e) => {
												e.stopPropagation();
												playSentenceAudio(index, lang);
											}}
											class="absolute top-2 right-2 p-1 text-xs rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors
												{playingSentenceIndex === index && isPlaying ? 'bg-green-100 text-green-700' : 'text-gray-600'}"
											title="Play this sentence"
										>
											{playingSentenceIndex === index && isPlaying ? '⏸️' : '🔊'}
										</button>
									</div>
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
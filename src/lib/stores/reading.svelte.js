/**
 * Reading session store - manages reactive state for text-audio synchronization
 * Uses Svelte 5 runes for optimal reactivity
 */

import { splitIntoSentences } from '$lib/services/books.js';

/**
 * Creates a reading session store with all the reactive state needed
 * for text highlighting, audio synchronization, and reading modes
 */
export function createReadingStore(initialData) {
	// Core session data
	const readingMode = initialData.session?.reading_mode || 'paragraph';
	const languages = initialData.session?.languages ? JSON.parse(initialData.session.languages) : [initialData.session?.language];
	const primaryLanguage = initialData.session?.language;
	
	// Page and content state
	let currentPage = $state(initialData.session?.current_page || 1);
	let pageContent = $state(initialData.pageContent);
	
	// Translation state for paragraph mode
	let translatedText = $state('');
	let phoneticText = $state('');
	let audioPath = $state('');
	
	// Translation state for sentence mode - {lang: {translatedText, phoneticText, audioPath}}
	let multipleTranslations = $state({});
	
	// UI state
	let isLoading = $state(false);
	let showPhonetic = $state(false);
	let selectedSentenceIndex = $state(null);
	let isMobile = $state(false);
	
	// Audio state
	let isPlaying = $state(false);
	let audioElement = $state(null);
	let selectedAudioLanguage = $state('');
	let playingSentenceIndex = $state(null);
	let sentenceAudioPaths = $state({});
	let loadingSentenceAudio = $state(false);
	let audioProgress = $state(0);
	let audioDuration = $state(0);
	
	// Test mode state (for debugging)
	let testHighlighting = $state(false);
	let testSentenceIndex = $state(0);
	let testWordIndex = $state(0);
	let currentlyPlayingSentenceInParagraph = $state(null);
	
	// Derived state - split content into sentences
	let originalSentences = $derived(splitIntoSentences(pageContent?.content || ''));
	let translatedSentences = $derived(splitIntoSentences(translatedText));
	let phoneticSentences = $derived(splitIntoSentences(phoneticText));
	
	// For sentence mode: split translations for each language
	let multipleTranslatedSentences = $state({});
	
	// Track if we've preloaded audio for this page
	let hasPreloaded = $state(false);
	
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
		}
	});
	
	// Effect to handle mobile detection
	$effect(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});
	
	return {
		// Core data (read-only)
		get readingMode() { return readingMode; },
		get languages() { return languages; },
		get primaryLanguage() { return primaryLanguage; },
		
		// Page state
		get currentPage() { return currentPage; },
		set currentPage(value) { currentPage = value; },
		get pageContent() { return pageContent; },
		set pageContent(value) { pageContent = value; },
		
		// Translation state
		get translatedText() { return translatedText; },
		set translatedText(value) { translatedText = value; },
		get phoneticText() { return phoneticText; },
		set phoneticText(value) { phoneticText = value; },
		get audioPath() { return audioPath; },
		set audioPath(value) { audioPath = value; },
		get multipleTranslations() { return multipleTranslations; },
		set multipleTranslations(value) { multipleTranslations = value; },
		
		// UI state
		get isLoading() { return isLoading; },
		set isLoading(value) { isLoading = value; },
		get showPhonetic() { return showPhonetic; },
		set showPhonetic(value) { showPhonetic = value; },
		get selectedSentenceIndex() { return selectedSentenceIndex; },
		set selectedSentenceIndex(value) { selectedSentenceIndex = value; },
		get isMobile() { return isMobile; },
		
		// Audio state
		get isPlaying() { return isPlaying; },
		set isPlaying(value) { isPlaying = value; },
		get audioElement() { return audioElement; },
		set audioElement(value) { audioElement = value; },
		get selectedAudioLanguage() { return selectedAudioLanguage; },
		set selectedAudioLanguage(value) { selectedAudioLanguage = value; },
		get playingSentenceIndex() { return playingSentenceIndex; },
		set playingSentenceIndex(value) { playingSentenceIndex = value; },
		get sentenceAudioPaths() { return sentenceAudioPaths; },
		set sentenceAudioPaths(value) { sentenceAudioPaths = value; },
		get loadingSentenceAudio() { return loadingSentenceAudio; },
		set loadingSentenceAudio(value) { loadingSentenceAudio = value; },
		get audioProgress() { return audioProgress; },
		set audioProgress(value) { audioProgress = value; },
		get audioDuration() { return audioDuration; },
		set audioDuration(value) { audioDuration = value; },
		
		// Test mode state
		get testHighlighting() { return testHighlighting; },
		set testHighlighting(value) { testHighlighting = value; },
		get testSentenceIndex() { return testSentenceIndex; },
		set testSentenceIndex(value) { testSentenceIndex = value; },
		get testWordIndex() { return testWordIndex; },
		set testWordIndex(value) { testWordIndex = value; },
		get currentlyPlayingSentenceInParagraph() { return currentlyPlayingSentenceInParagraph; },
		set currentlyPlayingSentenceInParagraph(value) { currentlyPlayingSentenceInParagraph = value; },
		
		// Derived state (read-only)
		get originalSentences() { return originalSentences; },
		get translatedSentences() { return translatedSentences; },
		get phoneticSentences() { return phoneticSentences; },
		get multipleTranslatedSentences() { return multipleTranslatedSentences; },
		
		// Preload state
		get hasPreloaded() { return hasPreloaded; },
		set hasPreloaded(value) { hasPreloaded = value; },
		
		// Utility methods
		selectSentence(index) {
			selectedSentenceIndex = selectedSentenceIndex === index ? null : index;
		},
		
		togglePhonetic() {
			showPhonetic = !showPhonetic;
		},
		
		toggleTestMode() {
			testHighlighting = !testHighlighting;
			if (testHighlighting) {
				const testInterval = setInterval(() => {
					testWordIndex = (testWordIndex + 1) % 10;
					if (testWordIndex === 0) {
						testSentenceIndex = (testSentenceIndex + 1) % Math.min(originalSentences.length, 3);
					}
				}, 1000);
				window.testInterval = testInterval;
			} else if (window.testInterval) {
				clearInterval(window.testInterval);
				testSentenceIndex = 0;
				testWordIndex = 0;
			}
		}
	};
}
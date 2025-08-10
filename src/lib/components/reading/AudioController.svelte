<script>
	import { setContext } from 'svelte';
	import { calculateCurrentSentence, calculateCurrentWord } from '$lib/services/highlighting.js';
	
	let { 
		store,
		sessionData,
		onLoadTranslation = () => {}
	} = $props();
	
	// Derived state for audio synchronization with improved reactive dependencies
	let currentSentenceFromAudio = $derived(() => {
		return calculateCurrentSentence({
			testHighlighting: store.testHighlighting,
			testSentenceIndex: store.testSentenceIndex,
			isPlaying: store.isPlaying,
			playingSentenceIndex: store.playingSentenceIndex,
			audioDuration: store.audioDuration,
			audioProgress: store.audioProgress,
			originalSentences: store.originalSentences,
			readingMode: store.readingMode,
			selectedAudioLanguage: store.selectedAudioLanguage,
			primaryLanguage: store.primaryLanguage
		});
	});
	
	// Calculate current word position within the active sentence
	let currentWordFromAudio = $derived(() => {
		return calculateCurrentWord({
			testHighlighting: store.testHighlighting,
			testWordIndex: store.testWordIndex,
			isPlaying: store.isPlaying,
			playingSentenceIndex: store.playingSentenceIndex,
			audioDuration: store.audioDuration,
			audioProgress: store.audioProgress,
			originalSentences: store.originalSentences,
			currentSentenceFromAudio,
			readingMode: store.readingMode,
			selectedAudioLanguage: store.selectedAudioLanguage,
			primaryLanguage: store.primaryLanguage
		});
	});
	
	// Effect to load translation when page changes
	$effect(() => {
		if (store.pageContent) {
			store.hasPreloaded = false; // Reset preload flag for new page
			onLoadTranslation();
		}
	});
	
	// Pre-load audio for all sentences to improve performance
	async function preloadSentenceAudio() {
		if (store.loadingSentenceAudio) return; // Already loading
		
		store.loadingSentenceAudio = true;
		const newAudioPaths = {};
		
		// Only pre-load for the selected audio language to reduce server load
		const targetLang = store.selectedAudioLanguage || Object.keys(store.multipleTranslations)[0];
		if (!targetLang) {
			store.loadingSentenceAudio = false;
			return;
		}
		
		try {
			newAudioPaths[targetLang] = {};
			
			// Generate audio for each sentence in parallel (but limit concurrency)
			const sentencePromises = store.originalSentences.map(async (sentence, index) => {
				try {
					const response = await fetch('/api/translate', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							bookId: sessionData.session.book_id,
							pageNumber: `${store.currentPage}_sentence_${index}`,
							originalText: sentence,
							language: targetLang,
							includePhonetic: false,
							includeAudio: true
						})
					});
					
					if (response.ok) {
						const result = await response.json();
						if (result.audioPath) {
							newAudioPaths[targetLang][index] = result.audioPath;
						}
					}
				} catch (error) {
					console.warn(`Failed to pre-load audio for sentence ${index} in ${targetLang}:`, error);
				}
			});
			
			// Process sentences in smaller batches to avoid overwhelming the server
			const batchSize = 2;
			for (let i = 0; i < sentencePromises.length; i += batchSize) {
				const batch = sentencePromises.slice(i, i + batchSize);
				await Promise.all(batch);
				// Add delay between batches to reduce server load
				if (i + batchSize < sentencePromises.length) {
					await new Promise(resolve => setTimeout(resolve, 200));
				}
			}
			
			store.sentenceAudioPaths = newAudioPaths;
		} catch (error) {
			console.error('Failed to pre-load sentence audio:', error);
		} finally {
			store.loadingSentenceAudio = false;
		}
	}
	
	// Main audio playback function
	async function playAudio() {
		let currentAudioPath = '';
		
		// Determine audio path based on reading mode
		if (store.readingMode === 'paragraph') {
			currentAudioPath = store.audioPath;
		} else if (store.readingMode === 'sentence' && store.selectedAudioLanguage && store.multipleTranslations[store.selectedAudioLanguage]) {
			currentAudioPath = store.multipleTranslations[store.selectedAudioLanguage].audioPath;
		}
		
		if (!currentAudioPath) {
			return;
		}
		
		if (store.isPlaying && store.audioElement) {
			store.audioElement.pause();
			store.isPlaying = false;
			store.playingSentenceIndex = null; // Clear any sentence-level playing state
			return;
		}
		
		try {
			// Create new audio element or update source if needed
			if (!store.audioElement || store.audioElement.src !== `/api/audio/${currentAudioPath}`) {
				if (store.audioElement) {
					store.audioElement.pause();
				}
				store.audioElement = new Audio(`/api/audio/${currentAudioPath}`);
				
				// Add event listeners for position tracking
				store.audioElement.addEventListener('loadedmetadata', () => {
					store.audioDuration = store.audioElement.duration;
				});
				
				store.audioElement.addEventListener('timeupdate', () => {
					if (store.audioElement && store.audioDuration > 0) {
						store.audioProgress = store.audioElement.currentTime / store.audioDuration;
					}
				});
				
				store.audioElement.addEventListener('ended', () => {
					store.isPlaying = false;
					store.audioProgress = 0;
					store.currentlyPlayingSentenceInParagraph = null;
				});
				
				store.audioElement.addEventListener('pause', () => {
					// Keep position but clear active state for visual feedback
					store.currentlyPlayingSentenceInParagraph = null;
				});
				
				store.audioElement.addEventListener('play', () => {
					// Audio started playing
				});
			}
			
			console.log('🎵 Attempting to play audio...');
			await store.audioElement.play();
			store.isPlaying = true;
			store.playingSentenceIndex = null; // Clear sentence-level playing state for page-level audio
			console.log('🎵 Audio play() succeeded, isPlaying:', store.isPlaying);
		} catch (error) {
			console.error('❌ Failed to play audio:', error);
		}
	}
	
	// Individual sentence audio playback
	async function playSentenceAudio(sentenceIndex, language) {
		if (store.playingSentenceIndex === sentenceIndex && store.isPlaying) {
			// Stop current playback
			if (store.audioElement) {
				store.audioElement.pause();
				store.isPlaying = false;
				store.playingSentenceIndex = null;
			}
			return;
		}
		
		// Check if we have pre-loaded audio for this sentence
		const preloadedPath = store.sentenceAudioPaths[language]?.[sentenceIndex];
		
		if (preloadedPath) {
			// Use pre-loaded audio for instant playback
			try {
				// Stop any current audio
				if (store.audioElement) {
					store.audioElement.pause();
				}
				
				// Create new audio element for this sentence
				store.audioElement = new Audio(`/api/audio/${preloadedPath}`);
				store.audioElement.addEventListener('ended', () => {
					store.isPlaying = false;
					store.playingSentenceIndex = null;
					store.audioProgress = 0;
				});
				
				await store.audioElement.play();
				store.isPlaying = true;
				store.playingSentenceIndex = sentenceIndex;
				return;
			} catch (error) {
				console.error('Failed to play pre-loaded sentence audio:', error);
			}
		}
		
		// Fallback: Generate audio on-demand if not pre-loaded
		const originalSentence = store.originalSentences[sentenceIndex];
		if (!originalSentence) return;
		
		try {
			const response = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookId: sessionData.session.book_id,
					pageNumber: `${store.currentPage}_sentence_${sentenceIndex}`,
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
					if (!store.sentenceAudioPaths[language]) {
						store.sentenceAudioPaths[language] = {};
					}
					store.sentenceAudioPaths[language][sentenceIndex] = result.audioPath;
					
					// Stop any current audio
					if (store.audioElement) {
						store.audioElement.pause();
					}
					
					// Create new audio element for this sentence
					store.audioElement = new Audio(`/api/audio/${result.audioPath}`);
					store.audioElement.addEventListener('ended', () => {
						store.isPlaying = false;
						store.playingSentenceIndex = null;
						store.audioProgress = 0;
					});
					
					await store.audioElement.play();
					store.isPlaying = true;
					store.playingSentenceIndex = sentenceIndex;
				}
			}
		} catch (error) {
			console.error('Failed to play sentence audio:', error);
		}
	}
	
	// Set context so child components can access audio functions
	setContext('audioController', {
		get currentSentenceFromAudio() { return currentSentenceFromAudio; },
		get currentWordFromAudio() { return currentWordFromAudio; },
		playAudio,
		playSentenceAudio,
		preloadSentenceAudio
	});
</script>

<!-- This component doesn't render anything, it just provides audio functionality -->
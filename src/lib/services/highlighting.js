/**
 * Text highlighting service for audio-text synchronization
 * Handles word-level highlighting calculations and timing
 */

// Language-specific speaking rates (words per minute)
export const SPEAKING_RATES = {
	'en': 180, // English: ~180 WPM
	'es': 160, // Spanish: ~160 WPM  
	'fr': 170, // French: ~170 WPM
	'de': 150, // German: ~150 WPM
	'it': 175, // Italian: ~175 WPM
	'pt': 165, // Portuguese: ~165 WPM
	'ru': 155, // Russian: ~155 WPM
	'default': 170
};

/**
 * Calculate which sentence should be highlighted based on audio progress
 */
export function calculateCurrentSentence(options) {
	const {
		testHighlighting,
		testSentenceIndex,
		isPlaying,
		playingSentenceIndex,
		audioDuration,
		audioProgress,
		originalSentences,
		currentLang,
		readingMode,
		selectedAudioLanguage,
		primaryLanguage
	} = options;
	
	// Test mode override
	if (testHighlighting) {
		return testSentenceIndex;
	}
	
	// Debug the conditions that might be blocking
	if (!isPlaying) {
		console.log('❌ Not playing audio');
		return null;
	}
	if (playingSentenceIndex !== null) {
		console.log('❌ Individual sentence is playing:', playingSentenceIndex);
		return null;
	}
	if (audioDuration === 0) {
		console.log('❌ Audio duration is 0');
		return null;
	}
	
	const totalWords = originalSentences.reduce((count, sentence) => {
		return count + sentence.split(/\s+/).filter(word => word.trim().length > 0).length;
	}, 0);
	
	if (totalWords === 0) return null;
	
	const lang = readingMode === 'sentence' ? selectedAudioLanguage : primaryLanguage;
	const wpm = SPEAKING_RATES[lang] || SPEAKING_RATES.default;
	
	// Calculate expected position based on speaking rate and audio time
	const elapsedSeconds = audioProgress * audioDuration;
	const expectedWordsSpoken = Math.floor((elapsedSeconds / 60) * wpm);
	
	// Debug logging
	console.log('🎵 Audio sync debug:', {
		isPlaying,
		playingSentenceIndex,
		audioDuration,
		audioProgress,
		elapsedSeconds,
		expectedWordsSpoken,
		wpm,
		lang,
		totalWords,
		testHighlighting
	});
	
	// Find sentence containing the expected word position
	let wordsSoFar = 0;
	for (let i = 0; i < originalSentences.length; i++) {
		const sentenceWords = originalSentences[i].split(/\s+/).filter(word => word.trim().length > 0).length;
		if (wordsSoFar + sentenceWords > expectedWordsSpoken) {
			console.log('🎯 Current sentence:', i, 'Words so far:', wordsSoFar, 'Sentence words:', sentenceWords);
			return i;
		}
		wordsSoFar += sentenceWords;
	}
	
	return originalSentences.length - 1;
}

/**
 * Calculate which word within a sentence should be highlighted
 */
export function calculateCurrentWord(options) {
	const {
		testHighlighting,
		testWordIndex,
		isPlaying,
		playingSentenceIndex,
		audioDuration,
		audioProgress,
		originalSentences,
		currentSentenceFromAudio,
		readingMode,
		selectedAudioLanguage,
		primaryLanguage
	} = options;
	
	// Test mode override
	if (testHighlighting) {
		return testWordIndex;
	}
	
	if (!isPlaying || playingSentenceIndex !== null || audioDuration === 0 || currentSentenceFromAudio === null) {
		return null;
	}
	
	const lang = readingMode === 'sentence' ? selectedAudioLanguage : primaryLanguage;
	const wpm = SPEAKING_RATES[lang] || SPEAKING_RATES.default;
	
	const elapsedSeconds = audioProgress * audioDuration;
	const expectedWordsSpoken = Math.floor((elapsedSeconds / 60) * wpm);
	
	// Calculate words spoken before current sentence
	let wordsBeforeCurrentSentence = 0;
	for (let i = 0; i < currentSentenceFromAudio; i++) {
		wordsBeforeCurrentSentence += originalSentences[i].split(/\s+/).filter(word => word.trim().length > 0).length;
	}
	
	// Calculate word position within current sentence
	const wordIndexInSentence = expectedWordsSpoken - wordsBeforeCurrentSentence;
	const sentenceWords = originalSentences[currentSentenceFromAudio].split(/\s+/).filter(word => word.trim().length > 0);
	const wordIndex = Math.max(0, Math.min(wordIndexInSentence, sentenceWords.length - 1));
	
	console.log('📝 Current word:', wordIndex, 'in sentence:', currentSentenceFromAudio);
	
	return wordIndex;
}

/**
 * Calculate sentence-level progress for visual indicator
 */
export function calculateSentenceProgress(options) {
	const {
		isPlaying,
		playingSentenceIndex,
		currentSentenceFromAudio,
		currentWordFromAudio,
		originalSentences
	} = options;
	
	if (!isPlaying || playingSentenceIndex !== null || currentSentenceFromAudio === null || currentWordFromAudio === null) {
		return {};
	}
	
	const sentenceWords = originalSentences[currentSentenceFromAudio].split(/\s+/).filter(word => word.trim().length > 0);
	const progressPercentage = Math.min(100, Math.max(0, ((currentWordFromAudio + 1) / sentenceWords.length) * 100));
	
	return {
		[currentSentenceFromAudio]: progressPercentage
	};
}

/**
 * Render sentence with word-level highlighting
 */
export function renderHighlightedSentence(sentence, sentenceIndex, currentSentenceFromAudio, currentWordFromAudio, isTranslated = false) {
	const words = sentence.split(/\s+/).filter(word => word.trim().length > 0);
	
	return words.map((word, wordIndex) => {
		const isCurrentSentence = currentSentenceFromAudio === sentenceIndex;
		const isCurrentWord = isCurrentSentence && currentWordFromAudio === wordIndex;  
		const isPastWord = isCurrentSentence && currentWordFromAudio !== null && wordIndex < currentWordFromAudio;
		
		let classes = 'inline transition-all duration-300 ease-in-out';
		
		if (isCurrentWord) {
			classes += ' bg-yellow-300 text-yellow-900 font-semibold px-1 rounded shadow-sm animate-pulse';
		} else if (isPastWord) {
			classes += ' bg-yellow-100 text-yellow-800 px-1 rounded';
		} else if (isCurrentSentence) {
			classes += ' bg-yellow-50';
		}
		
		return `<span class="${classes}" data-word="${wordIndex}" data-sentence="${sentenceIndex}">${word}</span>`;
	}).join(' ');
}

/**
 * Calculate total word count across all sentences
 */
export function calculateTotalWords(sentences) {
	return sentences.reduce((count, sentence) => {
		return count + sentence.split(/\s+/).filter(word => word.trim().length > 0).length;
	}, 0);
}

/**
 * Get estimated duration for text based on language and speaking rate
 */
export function getEstimatedDuration(text, language = 'en') {
	const words = text.split(/\s+/).filter(word => word.trim().length > 0).length;
	const wpm = SPEAKING_RATES[language] || SPEAKING_RATES.default;
	return (words / wpm) * 60; // Return duration in seconds
}
<script>
	import { renderHighlightedSentence, calculateSentenceProgress } from '$lib/services/highlighting.js';
	
	let { 
		sentence,
		sentenceIndex,
		currentSentenceFromAudio,
		currentWordFromAudio,
		isTranslated = false,
		store,
		showProgress = true
	} = $props();
	
	// Calculate sentence progress for visual indicator
	let sentenceProgress = $derived(
		!showProgress ? {} : calculateSentenceProgress({
			isPlaying: store.isPlaying,
			playingSentenceIndex: store.playingSentenceIndex,
			currentSentenceFromAudio,
			currentWordFromAudio,
			originalSentences: store.originalSentences
		})
	);
	
	// Generate highlighted HTML
	let highlightedHTML = $derived(
		renderHighlightedSentence(
			sentence, 
			sentenceIndex, 
			currentSentenceFromAudio, 
			currentWordFromAudio, 
			isTranslated
		)
	);
</script>

<div class="highlighted-text-wrapper">
	<p class="text-lg leading-relaxed">
		{@html highlightedHTML}
	</p>
	
	{#if showProgress && sentenceProgress[sentenceIndex] !== undefined}
		<div class="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
			<div 
				class="h-full bg-yellow-400 transition-all duration-300 ease-out"
				style="width: {sentenceProgress[sentenceIndex]}%"
			></div>
		</div>
	{/if}
</div>

<style>
	.highlighted-text-wrapper {
		/* Ensure proper text rendering */
	}
</style>
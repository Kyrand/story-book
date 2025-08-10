<script>
	import { getContext } from 'svelte';
	import HighlightedText from './HighlightedText.svelte';
	import { SUPPORTED_LANGUAGES } from '$lib/services/translation.js';
	
	let { 
		store
	} = $props();
	
	// Get audio controller from context
	const audioController = getContext('audioController');
	// These are already reactive getters from the context
	let currentSentenceFromAudio = $derived(audioController ? audioController.currentSentenceFromAudio : null);
	let currentWordFromAudio = $derived(audioController ? audioController.currentWordFromAudio : null);
</script>

{#if store.isMobile}
	<!-- Paragraph Mode - Mobile: Interlaced Layout -->
	<div class="space-y-4">
		{#each store.originalSentences as sentence, index}
			<div class="space-y-2">
				<button
					onclick={() => store.selectSentence(index)}
					class="text-left w-full p-4 rounded-lg transition-colors
						{store.selectedSentenceIndex === index ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white'}"
				>
					<div class="flex items-center gap-2 mb-2">
						<span class="text-xs text-gray-500">Original</span>
						{#if currentSentenceFromAudio === index && store.isPlaying}
							<span class="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800 animate-pulse">
								🎵 Playing
							</span>
						{/if}
					</div>
					<HighlightedText 
						{sentence}
						sentenceIndex={index}
						{currentSentenceFromAudio}
						{currentWordFromAudio}
						{store}
					/>
				</button>
				
				{#if store.translatedSentences[index]}
					<div class="pl-4 border-l-4 border-gray-300">
						<button
							onclick={() => store.selectSentence(index)}
							class="text-left w-full p-4 rounded-lg transition-colors
								{store.selectedSentenceIndex === index ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}"
						>
							<div class="flex items-center gap-2 mb-2">
								<span class="text-xs text-gray-500">Translation</span>
							</div>
							<HighlightedText 
								sentence={store.translatedSentences[index]}
								sentenceIndex={index}
								{currentSentenceFromAudio}
								{currentWordFromAudio}
								{store}
								isTranslated={true}
								showProgress={false}
							/>
							{#if store.showPhonetic && store.phoneticSentences[index]}
								<div class="text-sm text-gray-500 mt-2 italic">
									<HighlightedText 
										sentence={store.phoneticSentences[index]}
										sentenceIndex={index}
										{currentSentenceFromAudio}
										{currentWordFromAudio}
										{store}
										isTranslated={true}
										showProgress={false}
									/>
								</div>
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
			<div class="flex items-center gap-2 mb-4">
				<h3 class="font-semibold text-gray-700">Original (English)</h3>
				{#if currentSentenceFromAudio !== null && store.isPlaying}
					<span class="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800 animate-pulse">
						🎵 Playing
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				{#each store.originalSentences as sentence, index}
					<button
						onclick={() => store.selectSentence(index)}
						class="text-left w-full p-3 rounded transition-colors
							{store.selectedSentenceIndex === index ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-gray-50'}"
					>
						<HighlightedText 
							{sentence}
							sentenceIndex={index}
							{currentSentenceFromAudio}
							{currentWordFromAudio}
							{store}
						/>
					</button>
				{/each}
			</div>
		</div>
		
		<!-- Translated Text -->
		<div class="bg-white rounded-lg shadow-sm p-6">
			<h3 class="font-semibold text-gray-700 mb-4">
				{SUPPORTED_LANGUAGES[store.primaryLanguage]} Translation
			</h3>
			<div class="space-y-2">
				{#each store.translatedSentences as sentence, index}
					<button
						onclick={() => store.selectSentence(index)}
						class="text-left w-full p-3 rounded transition-colors
							{store.selectedSentenceIndex === index ? 'bg-green-50 border-2 border-green-300' : 'hover:bg-gray-50'}"
					>
						<HighlightedText 
							{sentence}
							sentenceIndex={index}
							{currentSentenceFromAudio}
							{currentWordFromAudio}
							{store}
							isTranslated={true}
							showProgress={false}
						/>
						{#if store.showPhonetic && store.phoneticSentences[index]}
							<div class="text-sm text-gray-500 mt-1 italic">
								<HighlightedText 
									sentence={store.phoneticSentences[index]}
									sentenceIndex={index}
									{currentSentenceFromAudio}
									{currentWordFromAudio}
									{store}
									isTranslated={true}
									showProgress={false}
								/>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
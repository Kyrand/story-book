<script>
	import { getContext } from 'svelte';
	import HighlightedText from './HighlightedText.svelte';
	import { LANGUAGES } from '$lib/constants/languages.js';
	
	let { 
		store
	} = $props();
	
	// Get audio controller from context
	const audioController = getContext('audioController');
	// These are already reactive getters from the context
	let currentSentenceFromAudio = $derived(audioController ? audioController.currentSentenceFromAudio : null);
	let currentWordFromAudio = $derived(audioController ? audioController.currentWordFromAudio : null);
	const playSentenceAudio = audioController?.playSentenceAudio;
</script>

<!-- Sentence Mode: Horizontal stacking with colored chips -->
<div class="space-y-6">
	{#each store.originalSentences as sentence, index}
		<div class="bg-white rounded-lg shadow-sm p-6">
			<!-- Original sentence -->
			<button
				onclick={() => store.selectSentence(index)}
				class="text-left w-full p-4 rounded-lg transition-colors mb-4
					{store.selectedSentenceIndex === index ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-gray-50 border border-gray-200'}"
			>
				<div class="flex items-center gap-2 mb-2">
					<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300">
						ENG
					</span>
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
			
			<!-- Translation sentences stacked horizontally -->
			<div class="space-y-3">
				{#each store.languages as lang}
					{#if store.multipleTranslatedSentences[lang]?.translated[index]}
						<div class="relative">
							<button
								onclick={() => store.selectSentence(index)}
								class="text-left w-full p-4 rounded-lg transition-colors
									{store.selectedSentenceIndex === index ? `${LANGUAGES[lang].bgColor} border-2 ${LANGUAGES[lang].borderColor}` : 'hover:bg-gray-50 border border-gray-200'}"
							>
								<div class="flex items-center gap-2 mb-2">
									<span class="text-xs px-2 py-1 rounded {LANGUAGES[lang].bgColor} {LANGUAGES[lang].textColor} border {LANGUAGES[lang].borderColor}">
										{LANGUAGES[lang].iso}
									</span>
									<span class="text-xs text-gray-500">{LANGUAGES[lang].name}</span>
									{#if currentSentenceFromAudio === index && store.isPlaying && store.selectedAudioLanguage === lang}
										<span class="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800 animate-pulse">
											🎵 Playing
										</span>
									{/if}
								</div>
								<HighlightedText 
									sentence={store.multipleTranslatedSentences[lang].translated[index]}
									sentenceIndex={index}
									{currentSentenceFromAudio}
									{currentWordFromAudio}
									{store}
									isTranslated={true}
								/>
								{#if store.showPhonetic && store.multipleTranslatedSentences[lang].phonetic[index]}
									<div class="text-sm text-gray-500 mt-2 italic">
										<HighlightedText 
											sentence={store.multipleTranslatedSentences[lang].phonetic[index]}
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
							
							<!-- Individual sentence audio button -->
							<button
								onclick={(e) => {
									e.stopPropagation();
									playSentenceAudio(index, lang);
								}}
								class="absolute top-2 right-2 p-1 text-xs rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors
									{store.playingSentenceIndex === index && store.isPlaying ? 'bg-green-100 text-green-700 animate-pulse' : 'text-gray-600'}"
								title="Play this sentence"
							>
								{store.playingSentenceIndex === index && store.isPlaying ? '⏸️' : '🔊'}
							</button>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
</div>
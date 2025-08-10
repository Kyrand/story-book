import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";
import { getOpenAIClient, translatePageMultiple, generatePhonetic, cacheMultipleTranslations, getCachedMultipleTranslations } from "$lib/services/translation.js";
import { OPENAI_API_KEY } from "$env/static/private";

export async function POST({ request, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    bookId,
    pageNumber,
    originalText,
    languages,
    includePhonetic = false,
    includeAudio = false,
    model = "gpt-3.5-turbo"
  } = await request.json();


  if (!bookId || !pageNumber || !originalText || !languages || languages.length === 0) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const result = { translations: {} };

    // Check for cached translations first
    if (db) {
      const cachedTranslations = await getCachedMultipleTranslations(db, bookId, languages, pageNumber);
      
      // Use cached translations where available
      for (const [lang, cached] of Object.entries(cachedTranslations)) {
        result.translations[lang] = {
          translatedText: cached.translated_text,
          phoneticText: cached.phonetic_text || '',
          audioPath: cached.audio_path || ''
        };
      }
    }

    // Find languages that need translation
    const missingLanguages = languages.filter(lang => !result.translations[lang]);

    if (missingLanguages.length > 0) {
      // Initialize OpenAI client
      const client = getOpenAIClient(OPENAI_API_KEY);
      if (!client) {
        return json(
          { error: "Translation service not configured" },
          { status: 503 }
        );
      }

      // Translate missing languages
      const newTranslations = await translatePageMultiple(
        originalText,
        missingLanguages,
        model
      );

      // Generate phonetic text if requested
      const phoneticTexts = {};
      if (includePhonetic) {
        for (const lang of missingLanguages) {
          try {
            phoneticTexts[lang] = await generatePhonetic(newTranslations[lang], lang, model);
          } catch (error) {
            console.error(`Failed to generate phonetic for ${lang}:`, error);
            phoneticTexts[lang] = '';
          }
        }
      }

      // Add new translations to result
      for (const lang of missingLanguages) {
        result.translations[lang] = {
          translatedText: newTranslations[lang],
          phoneticText: phoneticTexts[lang] || '',
          audioPath: '' // TODO: Implement audio generation for multiple languages
        };
      }

      // Cache the new translations
      if (db) {
        try {
          await cacheMultipleTranslations(
            db,
            bookId,
            missingLanguages,
            pageNumber,
            originalText,
            newTranslations,
            phoneticTexts
          );
        } catch (error) {
          console.error("Failed to cache translations:", error);
        }
      }
    }

    return json(result);
  } catch (error) {
    console.error("Translation error:", error);
    return json(
      { error: "Failed to translate text", details: error.message },
      { status: 500 }
    );
  }
}
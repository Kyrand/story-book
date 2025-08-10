import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getDatabase } from "$lib/db/schema.js";
import {
  translatePage,
  generatePhonetic,
  cacheTranslation,
  getCachedTranslation,
  getOpenAIClient,
} from "$lib/services/translation.js";
import { generatePageAudio } from "$lib/services/tts.js";

export async function POST({ request, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    bookId,
    pageNumber,
    originalText,
    language,
    model = "gpt-3.5-turbo",
    includePhonetic = false,
    includeAudio = false,
  } = await request.json();

  if (!bookId || !pageNumber || !originalText || !language) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const db = getDatabase();

    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY) {
      return json(
        {
          error:
            "OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file to enable translations and audio features.",
        },
        { status: 400 },
      );
    }

    // Initialize OpenAI client with API key
    getOpenAIClient(env.OPENAI_API_KEY);

    // Check for cached translation first
    const cached = await getCachedTranslation(db, bookId, language, pageNumber);

    if (cached && cached.translated_text) {
      // Return cached version if we have all requested data
      if (
        (!includePhonetic || cached.phonetic_text) &&
        (!includeAudio || cached.audio_path)
      ) {
        return json({
          translatedText: cached.translated_text,
          phoneticText: cached.phonetic_text,
          audioPath: cached.audio_path,
          cached: true,
        });
      }
    }

    // Translate the text
    const translatedText =
      cached?.translated_text ||
      (await translatePage(originalText, language, model));

    // Generate phonetic if requested
    let phoneticText = cached?.phonetic_text;
    if (includePhonetic && !phoneticText) {
      phoneticText = await generatePhonetic(translatedText, language, model);
    }

    // Generate audio if requested
    let audioPath = cached?.audio_path;
    if (includeAudio && !audioPath) {
      audioPath = await generatePageAudio(
        translatedText,
        bookId,
        language,
        pageNumber,
        "nova",
        env.OPENAI_API_KEY,
      );
    }

    // Cache the translation
    await cacheTranslation(
      db,
      bookId,
      language,
      pageNumber,
      originalText,
      translatedText,
      phoneticText,
      audioPath,
    );

    return json({
      translatedText,
      phoneticText,
      audioPath,
      cached: false,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return json(
      { error: "Translation failed: " + error.message },
      { status: 500 },
    );
  }
}

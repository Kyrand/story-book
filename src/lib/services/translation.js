import OpenAI from "openai";
// Note: Only use this on server-side
let openaiApiKey;

let openaiClient = null;

export function getOpenAIClient(apiKey) {
  if (!openaiClient && apiKey) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
    openaiApiKey = apiKey;
  }
  return openaiClient;
}

// Supported languages
export const SUPPORTED_LANGUAGES = {
  fr: "French",
  de: "German",
  es: "Spanish",
  ru: "Russian",
};

// Supported models
export const SUPPORTED_MODELS = {
  "gpt-4": "GPT-4",
  "gpt-4-turbo": "GPT-4 Turbo",
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
};

// Function to translate text
export async function translateText(
  text,
  targetLanguage,
  model = "gpt-3.5-turbo",
) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI client not configured. Please set OPENAI_API_KEY.");
  }

  if (!SUPPORTED_LANGUAGES[targetLanguage]) {
    throw new Error(`Unsupported language: ${targetLanguage}`);
  }

  if (!SUPPORTED_MODELS[model]) {
    throw new Error(`Unsupported model: ${model}`);
  }

  try {
    const languageName = SUPPORTED_LANGUAGES[targetLanguage];

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following English text to ${languageName}. Preserve the original formatting, paragraph breaks, and punctuation. Provide only the translation without any explanations or notes.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 4000,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error(`Failed to translate text: ${error.message}`);
  }
}

// Function to generate phonetic pronunciation
export async function generatePhonetic(
  text,
  language,
  model = "gpt-3.5-turbo",
) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI client not configured");
  }

  const languageName = SUPPORTED_LANGUAGES[language];
  if (!languageName) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are a language teacher. Provide phonetic pronunciation guide for the following ${languageName} text. Use simple English phonetics that an English speaker can read to approximate the pronunciation. Format each sentence on its own line. Do not include IPA symbols, use simple English approximations.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Phonetic generation error:", error);
    throw new Error(`Failed to generate phonetic text: ${error.message}`);
  }
}

// Function to split text into manageable chunks for translation
export function splitTextIntoChunks(text, maxChunkSize = 2000) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Function to translate a full page
export async function translatePage(
  pageText,
  targetLanguage,
  model = "gpt-3.5-turbo",
) {
  const chunks = splitTextIntoChunks(pageText);
  const translatedChunks = [];

  for (const chunk of chunks) {
    const translated = await translateText(chunk, targetLanguage, model);
    translatedChunks.push(translated);
    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return translatedChunks.join(" ");
}

// Function to translate text into multiple languages simultaneously
export async function translateTextMultiple(
  text,
  targetLanguages,
  model = "gpt-3.5-turbo",
) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI client not configured. Please set OPENAI_API_KEY.");
  }

  // Validate all languages
  for (const lang of targetLanguages) {
    if (!SUPPORTED_LANGUAGES[lang]) {
      throw new Error(`Unsupported language: ${lang}`);
    }
  }

  if (!SUPPORTED_MODELS[model]) {
    throw new Error(`Unsupported model: ${model}`);
  }

  const translations = {};

  try {
    // Translate to each language
    for (const targetLanguage of targetLanguages) {
      const languageName = SUPPORTED_LANGUAGES[targetLanguage];
      
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following English text to ${languageName}. Preserve the original formatting, paragraph breaks, and punctuation. Provide only the translation without any explanations or notes.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      translations[targetLanguage] = response.choices[0].message.content.trim();
      
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return translations;
  } catch (error) {
    console.error("Multiple translation error:", error);
    throw new Error(`Failed to translate text: ${error.message}`);
  }
}

// Function to translate a full page into multiple languages
export async function translatePageMultiple(
  pageText,
  targetLanguages,
  model = "gpt-3.5-turbo",
) {
  const chunks = splitTextIntoChunks(pageText);
  const translationsPerLanguage = {};

  // Initialize empty arrays for each language
  for (const lang of targetLanguages) {
    translationsPerLanguage[lang] = [];
  }

  for (const chunk of chunks) {
    const translations = await translateTextMultiple(chunk, targetLanguages, model);
    
    for (const lang of targetLanguages) {
      translationsPerLanguage[lang].push(translations[lang]);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Join chunks for each language
  const result = {};
  for (const lang of targetLanguages) {
    result[lang] = translationsPerLanguage[lang].join(" ");
  }

  return result;
}

// Cache translation in database
export async function cacheTranslation(
  db,
  bookId,
  language,
  pageNumber,
  originalText,
  translatedText,
  phoneticText = null,
  audioPath = null,
) {
  if (!db) {
    console.warn("Database not available for caching");
    return null;
  }

  try {
    const { randomUUID } = await import("crypto");
    const id = randomUUID();

    // Check if translation already exists
    const existing = db
      .prepare(
        `
			SELECT id FROM translations 
			WHERE book_id = ? AND language = ? AND page_number = ?
		`,
      )
      .get(bookId, language, pageNumber);

    if (existing) {
      // Update existing translation
      db.prepare(
        `
				UPDATE translations 
				SET translated_text = ?, phonetic_text = ?, audio_path = ?
				WHERE id = ?
			`,
      ).run(translatedText, phoneticText, audioPath, existing.id);

      return existing.id;
    } else {
      // Insert new translation
      db.prepare(
        `
				INSERT INTO translations (id, book_id, language, page_number, original_text, translated_text, phonetic_text, audio_path)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`,
      ).run(
        id,
        bookId,
        language,
        pageNumber,
        originalText,
        translatedText,
        phoneticText,
        audioPath,
      );

      return id;
    }
  } catch (error) {
    console.error("Error caching translation:", error);
    return null;
  }
}

// Get cached translation from database
export async function getCachedTranslation(db, bookId, language, pageNumber) {
  if (!db) {
    return null;
  }

  try {
    const translation = db
      .prepare(
        `
			SELECT * FROM translations 
			WHERE book_id = ? AND language = ? AND page_number = ?
		`,
      )
      .get(bookId, language, pageNumber);

    return translation;
  } catch (error) {
    console.error("Error fetching cached translation:", error);
    return null;
  }
}

// Cache multiple language translations
export async function cacheMultipleTranslations(
  db,
  bookId,
  languages,
  pageNumber,
  originalText,
  translations,
  phoneticTexts = {},
  audioPaths = {}
) {
  if (!db) {
    console.warn("Database not available for caching");
    return {};
  }

  const cachedIds = {};

  try {
    for (const language of languages) {
      const translationId = await cacheTranslation(
        db,
        bookId,
        language,
        pageNumber,
        originalText,
        translations[language],
        phoneticTexts[language] || null,
        audioPaths[language] || null
      );
      cachedIds[language] = translationId;
    }

    return cachedIds;
  } catch (error) {
    console.error("Error caching multiple translations:", error);
    return {};
  }
}

// Get cached translations for multiple languages
export async function getCachedMultipleTranslations(db, bookId, languages, pageNumber) {
  if (!db) {
    return {};
  }

  const translations = {};

  try {
    for (const language of languages) {
      const translation = await getCachedTranslation(db, bookId, language, pageNumber);
      if (translation) {
        translations[language] = translation;
      }
    }

    return translations;
  } catch (error) {
    console.error("Error fetching cached multiple translations:", error);
    return {};
  }
}

import OpenAI from "openai";
// Note: Only use this on server-side
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

let openaiClient = null;

export function getOpenAIClient(apiKey) {
  if (!openaiClient && apiKey) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
}

// OpenAI TTS voices
export const TTS_VOICES = {
  alloy: "Alloy",
  echo: "Echo",
  fable: "Fable",
  onyx: "Onyx",
  nova: "Nova",
  shimmer: "Shimmer",
};

// Generate speech from text
export async function generateSpeech(text, voice = "nova", speed = 1.0) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI client not configured. Please set OPENAI_API_KEY.");
  }

  if (!TTS_VOICES[voice]) {
    voice = "nova"; // Default voice
  }

  try {
    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      speed: speed,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("TTS error:", error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

// Compress audio using ffmpeg
export async function compressAudio(inputBuffer, outputPath) {
  return new Promise((resolve, reject) => {
    // Create temp input file
    const tempInput = path.join(
      path.dirname(outputPath),
      `temp_${Date.now()}.mp3`,
    );

    fs.writeFileSync(tempInput, inputBuffer);

    ffmpeg(tempInput)
      .audioCodec("libmp3lame")
      .audioBitrate("64k") // Lower bitrate for smaller file size
      .audioChannels(1) // Mono
      .audioFrequency(22050) // Lower sample rate
      .on("end", () => {
        // Clean up temp file
        fs.unlinkSync(tempInput);
        resolve(outputPath);
      })
      .on("error", (err) => {
        // Clean up temp file on error
        if (fs.existsSync(tempInput)) {
          fs.unlinkSync(tempInput);
        }
        reject(err);
      })
      .save(outputPath);
  });
}

// Generate and save audio for a text
export async function generateAndSaveAudio(
  text,
  bookId,
  language,
  pageNumber,
  voice = "nova",
  apiKey = null,
) {
  // Initialize OpenAI client with API key if provided
  if (apiKey) {
    getOpenAIClient(apiKey);
  }

  try {
    // Generate audio
    const audioBuffer = await generateSpeech(text, voice);

    // Create audio directory if it doesn't exist
    const audioDir = path.join(
      process.cwd(),
      "data",
      "audio",
      bookId,
      language,
    );
    await mkdir(audioDir, { recursive: true });

    // Define output path
    const filename = `page_${pageNumber}.mp3`;
    const outputPath = path.join(audioDir, filename);

    // Compress and save audio
    await compressAudio(audioBuffer, outputPath);

    // Return relative path for database storage
    return path.join("audio", bookId, language, filename);
  } catch (error) {
    console.error("Error generating and saving audio:", error);
    throw error;
  }
}

// Split text into smaller chunks for TTS (OpenAI has a 4096 character limit)
export function splitTextForTTS(text, maxLength = 4000) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
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

// Generate audio for a full page (handling long text)
export async function generatePageAudio(
  pageText,
  bookId,
  language,
  pageNumber,
  voice = "nova",
  apiKey = null,
) {
  // Initialize OpenAI client with API key if provided
  if (apiKey) {
    getOpenAIClient(apiKey);
  }
  const chunks = splitTextForTTS(pageText);

  if (chunks.length === 1) {
    // Single chunk, process normally
    return await generateAndSaveAudio(
      pageText,
      bookId,
      language,
      pageNumber,
      voice,
      apiKey,
    );
  }

  // Multiple chunks, need to concatenate
  const audioBuffers = [];

  for (const chunk of chunks) {
    const buffer = await generateSpeech(chunk, voice);
    audioBuffers.push(buffer);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Concatenate audio buffers
  const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
  const combinedBuffer = Buffer.concat(audioBuffers, totalLength);

  // Save combined audio
  const audioDir = path.join(process.cwd(), "data", "audio", bookId, language);
  await mkdir(audioDir, { recursive: true });

  const filename = `page_${pageNumber}.mp3`;
  const outputPath = path.join(audioDir, filename);

  // Compress and save
  await compressAudio(combinedBuffer, outputPath);

  return path.join("audio", bookId, language, filename);
}

// Get audio file path if it exists
export function getAudioPath(bookId, language, pageNumber) {
  const audioPath = path.join(
    process.cwd(),
    "data",
    "audio",
    bookId,
    language,
    `page_${pageNumber}.mp3`,
  );

  if (fs.existsSync(audioPath)) {
    return path.join("audio", bookId, language, `page_${pageNumber}.mp3`);
  }

  return null;
}

// Stream audio file for playback
export function streamAudioFile(filePath) {
  const fullPath = path.join(process.cwd(), "data", filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error("Audio file not found");
  }

  return fs.createReadStream(fullPath);
}

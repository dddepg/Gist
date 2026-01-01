import { franc } from 'franc-min'

/**
 * Language detection using franc-min
 * Maps ISO 639-3 codes to language names
 */

// Map ISO 639-3 codes to language names
const ISO_TO_LANGUAGE: Record<string, string> = {
  cmn: 'Chinese', // Mandarin Chinese
  zho: 'Chinese', // Chinese (generic)
  jpn: 'Japanese',
  kor: 'Korean',
  eng: 'English',
  fra: 'French',
  deu: 'German',
  spa: 'Spanish',
  rus: 'Russian',
  ara: 'Arabic',
  por: 'Portuguese',
  ita: 'Italian',
}

// Map target language codes to language names
const TARGET_LANGUAGE_MAP: Record<string, string> = {
  'zh-CN': 'Chinese',
  'zh-TW': 'Chinese',
  'en-US': 'English',
  'en': 'English',
  'ja': 'Japanese',
  'ko': 'Korean',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'ru': 'Russian',
  'ar': 'Arabic',
  'pt': 'Portuguese',
  'it': 'Italian',
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Detect the language of text
 * Returns language name or null if uncertain
 */
export function detectLanguage(text: string): string | null {
  if (!text || text.length < 10) return null

  // Clean text for better detection
  const cleanText = stripHtml(text)
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .trim()

  if (cleanText.length < 10) return null

  const detected = franc(cleanText)

  if (detected === 'und') {
    // Undetermined
    return null
  }

  return ISO_TO_LANGUAGE[detected] || null
}

/**
 * Get normalized language name from target language code
 */
export function getTargetLanguageName(targetLanguage: string): string {
  return TARGET_LANGUAGE_MAP[targetLanguage] || targetLanguage
}

/**
 * Check if text is already in the target language
 */
export function isTargetLanguage(
  text: string,
  targetLanguage: string
): boolean {
  const detected = detectLanguage(text)
  if (!detected) return false

  const targetName = getTargetLanguageName(targetLanguage)
  return detected.toLowerCase() === targetName.toLowerCase()
}

/**
 * Check if an article needs translation based on title and summary
 */
export function needsTranslation(
  title: string,
  summary: string | null,
  targetLanguage: string
): boolean {
  // Combine title and summary for better detection
  const textToCheck = summary ? `${title} ${summary}` : title

  const detected = detectLanguage(textToCheck)

  // If can't detect, assume needs translation
  if (!detected) return true

  const targetName = getTargetLanguageName(targetLanguage)
  // Check if detected language matches target
  return detected.toLowerCase() !== targetName.toLowerCase()
}

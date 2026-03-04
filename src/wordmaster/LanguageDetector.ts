// =============================================================================
// wordmaster/LanguageDetector.ts
//
// Detects which language word lists are usable with a given font by comparing
// the font's Unicode codepoint coverage against the codepoints required by
// each language's word list file.
//
// language_charsets.json is produced by:
//   python3 scripts/build_language_charsets.py
// and lives at:
//   http_root/corpus/words/language_charsets.json
// =============================================================================

/** Shape of language_charsets.json — map of language name → sorted codepoints */
export type LanguageCharsets = Record<string, number[]>;

/** A word paired with its BCP 47 language tag for use in the `lang` attribute. */
export interface WordEntry {
  word: string;
  lang: string;
}

/**
 * Maps the language filename stem (e.g. "german") to its BCP 47 tag (e.g. "de").
 * Used to set the HTML `lang` attribute so the browser/OS applies the correct
 * language-specific OpenType features (locl, ss*, etc.).
 */
export const BCP47_TAGS: Readonly<Record<string, string>> = {
  basque:       'eu',
  belarussian:  'be',
  bulgarian:    'bg',
  catalan:      'ca',
  croatian:     'hr',
  czech:        'cs',
  danish:       'da',
  english:      'en',
  estonian:     'et',
  finnish:      'fi',
  french:       'fr',
  german:       'de',
  greek:        'el',
  icelandic:    'is',
  irish:        'ga',
  italian:      'it',
  kazakh:       'kk',
  kyrgyz:       'ky',
  latvian:      'lv',
  lithuanian:   'lt',
  norwegian:    'no',
  polish:       'pl',
  portuguese:   'pt',
  romansh:      'rm',
  russian:      'ru',
  serbian:      'sr',
  slovenian:    'sl',
  spanish:      'es',
  swedish:      'sv',
  turkish:      'tr',
  ukrainian:    'uk',
  vietnamese:   'vi',
  welsh:        'cy',
};

/**
 * Returns the BCP 47 tag for a language key, falling back to the key itself
 * so that unknown languages are still passed through as-is.
 */
export function langToBcp47(language: string): string {
  return BCP47_TAGS[language] ?? language;
}

/**
 * Fraction of a language's required codepoints that must be present in the
 * font for the language to be considered supported.
 *
 *   1.0 = every character must be present (strict — no .notdef fallbacks)
 *   0.9 = 90 % must be present (tolerates a handful of missing glyphs)
 */
const COVERAGE_THRESHOLD = 1.0;

// ---------------------------------------------------------------------------
// Font codepoint extraction
// ---------------------------------------------------------------------------

/**
 * Builds the complete set of Unicode codepoints available in the given font.
 */
export function buildFontCodepointSet(font: opentype.Font): Set<number> {
  const codepoints = new Set<number>();
  const glyphCount = font.glyphs.length;

  for (let i = 0; i < glyphCount; i++) {
    const glyph = font.glyphs.get(i);
    if (glyph.unicode !== undefined) {
      codepoints.add(glyph.unicode);
    }
  }

  return codepoints;
}

// ---------------------------------------------------------------------------
// Charset data loading
// ---------------------------------------------------------------------------

/**
 * Fetches the pre-built language charset map from the server.
 * Cached by the browser after the first request.
 */
export async function fetchLanguageCharsets(
  corpusBase: string,
): Promise<LanguageCharsets> {
  const url      = `${corpusBase}/language_charsets.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch language_charsets.json (${response.status})`);
  }

  return response.json() as Promise<LanguageCharsets>;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export interface DetectionResult {
  /** Language names whose word lists are fully covered by the font */
  supportedLanguages: string[];
  /** Ready-to-fetch filenames, e.g. ["german.txt", "french.txt"] */
  wordListFiles: string[];
  /** Coverage ratio per language (0–1), useful for diagnostics */
  coverageReport: Record<string, number>;
}

/**
 * Compares each language's required codepoints against the font's available
 * codepoints and returns all languages that meet the coverage threshold.
 *
 * @param fontCodepoints  Set built by buildFontCodepointSet()
 * @param charsets        Data from language_charsets.json
 * @param threshold       Minimum fraction of codepoints that must be present
 */
export function detectSupportedLanguages(
  fontCodepoints: Set<number>,
  charsets: LanguageCharsets,
  threshold = COVERAGE_THRESHOLD,
): DetectionResult {
  const supportedLanguages: string[] = [];
  const coverageReport: Record<string, number> = {};

  for (const [language, required] of Object.entries(charsets)) {
    if (required.length === 0) continue;

    const coveredCount = required.filter(cp => fontCodepoints.has(cp)).length;
    const ratio        = coveredCount / required.length;

    // Round to three decimal places for readability
    coverageReport[language] = Math.round(ratio * 1000) / 1000;

    if (ratio >= threshold) {
      supportedLanguages.push(language);
    }
  }

  supportedLanguages.sort();

  const wordListFiles = supportedLanguages.map(lang => `${lang}.txt`);

  return { supportedLanguages, wordListFiles, coverageReport };
}

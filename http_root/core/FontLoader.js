// =============================================================================
// core/FontLoader.js
// =============================================================================

import { getFontInformation } from './FontInfo.js';

export class FontLoader {
  /**
   * Creates a new FontLoader instance
   * @param {Object} options - Configuration options
   * @param {Function} options.onFontLoaded - Callback when font is loaded
   * @param {Function} options.onError - Callback when error occurs
   */
  constructor(options = {}) {
    this.currentFont = null;
    this.callbacks = options;
  }

  /**
   * Loads a font from an ArrayBuffer
   * @param {ArrayBuffer} buffer - The font file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Font information and loaded font
   */
  async loadFont(buffer, filename) {
    try {
      // Parse the font using OpenType.js
      const font = opentype.parse(buffer);
      console.log('OpenType parsed font:', {
        tables: Object.keys(font.tables),
        hasFvar: !!font.tables.fvar,
        axes: font.tables.fvar?.axes
      });

      // Create a unique name for this font instance
      const uniqueFontName = `Font_${Date.now()}`;

      // Create and load the font face
      const fontFace = new FontFace(uniqueFontName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      // Store current font and get info
      this.currentFont = font;
      const fontInfo = getFontInformation(font, filename);

      console.log('Font info generated:', fontInfo);

      this.callbacks.onFontLoaded?.({ font, fontInfo, fontFamily: uniqueFontName, buffer });
      return { font, fontInfo, fontFamily: uniqueFontName, buffer };

    } catch (error) {
      console.error('Error loading font:', error);
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Cleans up the current font
   */
  cleanup() {
    if (this.currentFont) {
      document.fonts.forEach(font => {
        if (font.family.startsWith('Font_')) {
          document.fonts.delete(font);
        }
      });
      this.currentFont = null;
    }
  }
}
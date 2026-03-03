// =============================================================================
// core/FontLoader.ts
// =============================================================================

import { getFontInformation } from './FontInfo.js';
import { saveFont, getSavedFont, saveInstanceIndex, saveAxisSettings, saveLastChanged } from '../shared/FontSession.js';
import type { FontLoadResult, FontLoaderOptions } from './Types.js';

export type { FontLoadResult, FontLoaderOptions };

interface LoadFontOptions {
  preserveInstance?: boolean;
}

export class FontLoader {
  public currentFont: opentype.Font | null = null;
  private readonly callbacks: FontLoaderOptions;

  constructor(options: FontLoaderOptions = {}) {
    this.callbacks = options;
  }

  /**
   * Loads a font from an ArrayBuffer, registers it with the browser as a
   * FontFace, and returns a FontLoadResult.
   */
  async loadFont(
    buffer: ArrayBuffer,
    filename: string = '',
    { preserveInstance = false }: LoadFontOptions = {},
  ): Promise<FontLoadResult> {
    try {
      const font = opentype.parse(buffer);

      console.log('OpenType parsed font:', {
        tables:  Object.keys(font.tables),
        hasFvar: !!font.tables.fvar,
        axes:    font.tables.fvar?.axes,
      });

      const uniqueFontName = `Font_${Date.now()}`;
      const fontFace = new FontFace(uniqueFontName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      this.currentFont = font;
      const fontInfo = getFontInformation(font, filename);

      console.log('Font info generated:', fontInfo);

      saveFont(buffer, filename);
      if (!preserveInstance) {
        saveInstanceIndex(null);
        saveAxisSettings(null);
        saveLastChanged(null);
      }

      const result: FontLoadResult = { font, fontInfo, fontFamily: uniqueFontName, buffer };
      this.callbacks.onFontLoaded?.(result);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error loading font:', error);
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Restores the last loaded font from sessionStorage (survives page navigation).
   * Safe to call on DOMContentLoaded — a no-op when no font has been saved.
   */
  async restoreFromSession(): Promise<void> {
    const saved = getSavedFont();
    if (!saved) return;

    const dropText = document.getElementById('drop-text');
    dropText?.remove();

    await this.loadFont(saved.buffer, saved.filename, { preserveInstance: true });
  }

  /** Removes any FontFace instances attached by this loader and clears state. */
  cleanup(): void {
    if (this.currentFont) {
      document.fonts.forEach(face => {
        if (face.family.startsWith('Font_')) {
          document.fonts.delete(face);
        }
      });
      this.currentFont = null;
    }
  }
}

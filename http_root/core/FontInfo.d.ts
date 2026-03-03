import { type FontInformation } from './Types.js';
export declare class FontInfoRenderer {
    /**
     * Renders font information into a container element.
     */
    static renderFontInfo(container: HTMLElement | null, info: FontInformation): void;
    /**
     * Renders glyph information into a container element.
     */
    static renderGlyphInfo(container: HTMLElement | null, font: opentype.Font | null, glyph: string): void;
}
/**
 * Extracts comprehensive information about a font file.
 */
export declare function getFontInformation(font: opentype.Font, filename: string): FontInformation;
//# sourceMappingURL=FontInfo.d.ts.map
import type { FontLoadResult, FontLoaderOptions } from './Types.js';
export type { FontLoadResult, FontLoaderOptions };
interface LoadFontOptions {
    preserveInstance?: boolean;
}
export declare class FontLoader {
    currentFont: opentype.Font | null;
    private readonly callbacks;
    constructor(options?: FontLoaderOptions);
    /**
     * Loads a font from an ArrayBuffer, registers it with the browser as a
     * FontFace, and returns a FontLoadResult.
     */
    loadFont(buffer: ArrayBuffer, filename?: string, { preserveInstance }?: LoadFontOptions): Promise<FontLoadResult>;
    /**
     * Restores the last loaded font from sessionStorage (survives page navigation).
     * Safe to call on DOMContentLoaded — a no-op when no font has been saved.
     */
    restoreFromSession(): Promise<void>;
    /** Removes any FontFace instances attached by this loader and clears state. */
    cleanup(): void;
}
//# sourceMappingURL=FontLoader.d.ts.map
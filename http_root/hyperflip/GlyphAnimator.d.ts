export interface GlyphAnimatorOptions {
    displayElement: HTMLElement | null;
    onGlyphChange?: (glyph: string) => void;
}
export declare class GlyphAnimator {
    readonly displayElement: HTMLElement;
    private readonly onGlyphChange?;
    glyphs: string[];
    private sequentialGlyphs;
    currentIndex: number;
    isAnimating: boolean;
    private animationFrameId;
    isRandomOrder: boolean;
    private lastFrameTime;
    interval: number;
    constructor(options: GlyphAnimatorOptions);
    setGlyphsFromFont(font: opentype.Font): Promise<void>;
    start(interval: number): void;
    stop(): void;
    private animate;
    moveForward(steps?: number): void;
    moveBack(steps?: number): void;
    toggleOrder(): void;
    private shuffleArray;
}
//# sourceMappingURL=GlyphAnimator.d.ts.map
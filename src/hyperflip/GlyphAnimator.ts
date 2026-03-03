// =============================================================================
// hyperflip/GlyphAnimator.ts
// =============================================================================

export interface GlyphAnimatorOptions {
  displayElement: HTMLElement | null;
  onGlyphChange?: (glyph: string) => void;
}

export class GlyphAnimator {
  public readonly displayElement: HTMLElement;
  private readonly onGlyphChange?: (glyph: string) => void;

  public  glyphs:           string[]         = [];
  private sequentialGlyphs: string[]         = [];
  public  currentIndex:     number           = 0;
  public  isAnimating:       boolean          = false;
  private animationFrameId:  number | null    = null;
  public  isRandomOrder:     boolean          = false;

  // Animation timing
  private lastFrameTime: number = 0;
  public  interval:      number = 100;

  constructor(options: GlyphAnimatorOptions) {
    this.displayElement = options.displayElement ?? document.createElement('div');
    this.onGlyphChange  = options.onGlyphChange;
  }

  async setGlyphsFromFont(font: opentype.Font): Promise<void> {
    const chars: string[] = [];
    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);
      if (glyph.name === '.notdef' || glyph.unicode === undefined) continue;
      chars.push(String.fromCodePoint(glyph.unicode));
    }
    this.glyphs           = chars;
    this.sequentialGlyphs = [...chars];
    this.currentIndex     = 0;
  }

  start(interval: number): void {
    if (this.glyphs.length === 0) {
      console.error('No glyphs available for animation');
      return;
    }
    this.interval      = interval;
    this.isAnimating   = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  stop(): void {
    this.isAnimating = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate(currentTime: number = performance.now()): void {
    if (!this.isAnimating) return;

    const elapsed = currentTime - this.lastFrameTime;

    if (elapsed >= this.interval) {
      const currentChar = this.glyphs[this.currentIndex];
      if (currentChar !== undefined) {
        this.displayElement.textContent = currentChar;
        this.onGlyphChange?.(currentChar);
      }

      this.currentIndex  = (this.currentIndex + 1) % this.glyphs.length;
      this.lastFrameTime = currentTime - (elapsed % this.interval);
    }

    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
  }

  moveForward(steps = 1): void {
    this.currentIndex = (this.currentIndex + steps) % this.glyphs.length;
    const currentChar = this.glyphs[this.currentIndex];
    if (currentChar !== undefined) {
      this.displayElement.textContent = currentChar;
      this.onGlyphChange?.(currentChar);
    }
  }

  moveBack(steps = 1): void {
    this.currentIndex = (this.currentIndex - steps + this.glyphs.length) % this.glyphs.length;
    const currentChar = this.glyphs[this.currentIndex];
    if (currentChar !== undefined) {
      this.displayElement.textContent = currentChar;
      this.onGlyphChange?.(currentChar);
    }
  }

  toggleOrder(): void {
    if (this.isRandomOrder) {
      this.glyphs = [...this.sequentialGlyphs];
    } else {
      this.glyphs = this.shuffleArray([...this.glyphs]);
    }
    this.isRandomOrder = !this.isRandomOrder;
    this.currentIndex  = 0;
  }

  private shuffleArray(array: string[]): string[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
    return array;
  }
}

// =============================================================================
// wordmaster/WordMaster.ts
// =============================================================================

import { FontLoader }       from '../core/FontLoader.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { VariationAxes }    from '../shared/VariationAxes.js';
import { UIControls }       from '../shared/UIControls.js';
import { DragAndDrop }      from '../shared/DragAndDrop.js';
import { TextFitter }       from './TextFitter.js';
import { OpenTypeFeatures } from './OpenTypeFeatures.js';
import { initAppNav }       from '../shared/AppNav.js';
import type { FontLoadResult } from '../core/Types.js';
import {
  buildFontCodepointSet,
  fetchLanguageCharsets,
  detectSupportedLanguages,
  langToBcp47,
  type WordEntry,
} from './LanguageDetector.js';

export class WordAnimator {
  public readonly fontLoader: FontLoader;

  private readonly uiControls:      UIControls;
  private readonly dragAndDrop:     DragAndDrop;
  private readonly textFitter:      TextFitter;
  private readonly openTypeFeatures: OpenTypeFeatures;
  private readonly variationAxes:   VariationAxes;
  private readonly container:       HTMLElement | null;

  private wordList:                WordEntry[] = [];
  private processedWordList:       WordEntry[] = [];
  private animationTimer:          ReturnType<typeof setTimeout> | null = null;
  private fadeTimer:               ReturnType<typeof setTimeout> | null = null;
  private loadedFont:              opentype.Font | null = null;

  // Navigation history — lets j/k step back and forward through shown words
  private history:      WordEntry[] = [];
  private historyIndex: number      = -1;
  private static readonly HISTORY_MAX = 200;
  private currentVariationSettings = 'normal';
  private paddingPercentage        = 10;
  private animationDelay           = 3000;
  private isAnimating              = false;

  private readonly _keyHandler:    (e: KeyboardEvent) => void;
  private readonly _resizeHandler: () => void;

  constructor() {
    this.container = document.getElementById('word');
    if (this.container) {
      this.container.style.width    = '100%';
      this.container.style.height   = '100%';
      this.container.style.position = 'relative';
    }

    this.openTypeFeatures = new OpenTypeFeatures((featureString) => {
      this.updateFeatures(featureString);
    });

    this.uiControls  = new UIControls();
    this.textFitter  = new TextFitter({ paddingPercentage: this.paddingPercentage });

    this.fontLoader = new FontLoader({
      onFontLoaded: (result) => { this.handleFontLoaded(result); },
    });

    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop:   (buffer, filename) => {
        this.stop();
        void this.fontLoader.loadFont(buffer, filename);
      },
    });

    this.variationAxes = new VariationAxes({
      container: document.getElementById('controls') as HTMLElement,
      onChange:  (settings) => {
        this.currentVariationSettings = settings;
        const firstChild = this.container?.firstElementChild as HTMLElement | null;
        if (firstChild) firstChild.style.fontVariationSettings = settings;
      },
    });

    this._keyHandler    = (e) => { this.handleKeyPress(e); };
    this._resizeHandler = () => {
      const firstChild = this.container?.firstElementChild as HTMLElement | null;
      if (firstChild && this.container) {
        this.textFitter.fitText(firstChild, this.container);
      }
    };

    this.setupEventListeners();
    this.initializeSliders();
    void this.loadWordList(null);
    window.addEventListener('resize', this._resizeHandler);
  }

  private updateFeatures(featureString: string): void {
    const firstChild = this.container?.firstElementChild as HTMLElement | null;
    if (firstChild && this.container) {
      firstChild.style.fontFeatureSettings = featureString;
      this.textFitter.fitText(firstChild, this.container);
    }
  }

  private initializeSliders(): void {
    const sliders = document.querySelectorAll<HTMLElement>('.slider-container');

    const sizeContainer = sliders[0];
    const sizeSlider    = sizeContainer?.querySelector<HTMLInputElement>('input[type="range"]');
    const sizeValue     = sizeContainer?.querySelector<HTMLElement>('.value');

    if (sizeSlider) {
      sizeSlider.min   = '20';
      sizeSlider.max   = '100';
      const initialSize = 90;
      sizeSlider.value = String(initialSize);
      this.paddingPercentage = 40 - ((initialSize - 20) * 40 / 80);
      if (sizeValue) sizeValue.textContent = `${initialSize}%`;
    }

    sizeSlider?.addEventListener('input', () => {
      const sizePercentage   = parseInt(sizeSlider.value, 10);
      this.paddingPercentage = 40 - ((sizePercentage - 20) * 40 / 80);
      this.textFitter.paddingPercentage = this.paddingPercentage;
      if (sizeValue) sizeValue.textContent = `${sizePercentage}%`;
      const firstChild = this.container?.firstElementChild as HTMLElement | null;
      if (firstChild && this.container) {
        this.textFitter.fitText(firstChild, this.container);
      }
    });

    const delayContainer = sliders[1];
    const delaySlider    = delayContainer?.querySelector<HTMLInputElement>('input[type="range"]');
    const delayValue     = delayContainer?.querySelector<HTMLElement>('.value');

    if (delaySlider) {
      this.animationDelay = parseInt(delaySlider.value, 10);
    }

    delaySlider?.addEventListener('input', () => {
      const newDelay = parseInt(delaySlider.value, 10);
      if (delayValue) delayValue.textContent = `${newDelay}ms`;
      this.animationDelay = newDelay;
      if (this.isAnimating) {
        if (this.animationTimer !== null) clearTimeout(this.animationTimer);
        this.scheduleNextUpdate();
      }
    });
  }

  private setupEventListeners(): void {
    this.uiControls.setupSharedButtons();
    document.addEventListener('keydown', this._keyHandler);
  }

  private handleKeyPress(event: KeyboardEvent): void {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (this.isAnimating) {
          this.stop();
        } else {
          void this.start(this.animationDelay);
        }
        break;
      case 'j': {
        event.preventDefault();
        // Step back one word — pause the animation if it is running
        this.stop();
        const prev = this.historyBack();
        if (prev) void this.fadeToEntry(prev);
        break;
      }
      case 'k':
        event.preventDefault();
        // Step forward one word — pause the animation if it is running
        this.stop();
        void this.fadeToEntry(this.historyAdvance());
        break;
      case 'f':
        this.uiControls.toggleFullscreen();
        break;
    }
  }

  private async loadWordList(font: opentype.Font | null): Promise<void> {
    const CORPUS_BASE = 'corpus/words';

    try {
      if (font === null) {
        // No font loaded yet — use English as a sensible default
        const response = await fetch(`${CORPUS_BASE}/english.txt`);
        const text     = await response.text();
        this.wordList  = text.split('\n')
          .map(w => w.trim()).filter(w => w.length > 0)
          .map(word => ({ word, lang: 'en' }));
        this.processWordList();
        return;
      }

      // Build the set of codepoints the font actually contains
      const fontCodepoints = buildFontCodepointSet(font);

      // Fetch the pre-built charset map (cached after first load)
      const charsets = await fetchLanguageCharsets(CORPUS_BASE);

      // Detect which language word lists this font fully supports
      const { supportedLanguages, wordListFiles, coverageReport } =
        detectSupportedLanguages(fontCodepoints, charsets);

      console.log('[WordMaster] Supported languages:', supportedLanguages);
      console.table(coverageReport);

      const filesToLoad = wordListFiles.length > 0
        ? wordListFiles
        : ['english.txt'];  // Fallback when no language matched

      if (wordListFiles.length === 0) {
        console.warn('[WordMaster] No language word lists matched — falling back to english.txt');
      }

      // Fetch all matched word list files in parallel, keeping the language name
      const fetches = filesToLoad.map((filename, i) => {
        const language = (wordListFiles.length > 0 ? supportedLanguages[i] : 'english') ?? 'english';
        const bcp47    = langToBcp47(language);
        return fetch(`${CORPUS_BASE}/${filename}`)
          .then(r => r.text())
          .then(text =>
            text.split('\n')
              .map(w => w.trim()).filter(w => w.length > 0)
              .map((word): WordEntry => ({ word, lang: bcp47 })),
          );
      });
      this.wordList = (await Promise.all(fetches)).flat();
      this.processWordList();

    } catch (err) {
      console.error('[WordMaster] loadWordList failed:', err);
      this.wordList          = ['OpenType', 'Features', 'Typography', 'Design']
        .map(word => ({ word, lang: 'en' }));
      this.processedWordList = this.wordList;
    }
  }

  private processWordList(): void {
    // Clear navigation history whenever the word pool changes
    this.history      = [];
    this.historyIndex = -1;

    this.processedWordList = this.wordList.map(({ word, lang }) => {
      if (word === word.toLowerCase()) {
        const random = Math.random();
        if (random < 0.15) return { word: word.toUpperCase(), lang };
        if (random < 0.50) return { word: word.charAt(0).toUpperCase() + word.slice(1), lang };
      }
      return { word, lang };
    });
  }

  // ---------------------------------------------------------------------------
  // History navigation
  // ---------------------------------------------------------------------------

  /**
   * Returns the next word, replaying from history if the user has stepped back,
   * otherwise picks a new random word and appends it to the history.
   */
  private historyAdvance(): WordEntry {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex]!;
    }
    const entry = this.getRandomWord();
    this.historyIndex++;
    this.history.push(entry);
    // Cap memory use
    if (this.history.length > WordAnimator.HISTORY_MAX) {
      this.history.shift();
      this.historyIndex--;
    }
    return entry;
  }

  /**
   * Steps one word back in history. Returns null if already at the beginning.
   */
  private historyBack(): WordEntry | null {
    if (this.historyIndex <= 0) return null;
    this.historyIndex--;
    return this.history[this.historyIndex] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Word rendering helpers
  // ---------------------------------------------------------------------------

  /**
   * Renders a word entry into the container DOM element immediately (no fade).
   */
  private renderEntry(entry: WordEntry): void {
    if (!this.container) return;
    const wordElement = document.createElement('div');
    wordElement.textContent                  = entry.word;
    wordElement.lang                         = entry.lang;
    wordElement.style.whiteSpace             = 'nowrap';
    wordElement.style.fontFeatureSettings    = this.openTypeFeatures.getFeatureString();
    wordElement.style.fontVariationSettings  = this.currentVariationSettings;
    this.container.innerHTML = '';
    this.container.appendChild(wordElement);
    this.textFitter.fitText(wordElement, this.container);
  }

  /**
   * Fades the container out, renders the entry, then fades back in.
   * Works whether the animation is running or paused (used by j/k navigation).
   */
  private fadeToEntry(entry: WordEntry): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.fadeTimer !== null) clearTimeout(this.fadeTimer);
      this.container?.classList.add('fade-out');
      this.fadeTimer = setTimeout(() => {
        this.renderEntry(entry);
        this.container?.classList.remove('fade-out');
        resolve();
      }, 300);
    });
  }

  private handleFontLoaded({ font, fontInfo, fontFamily, buffer }: FontLoadResult): void {
    FontInfoRenderer.renderFontInfo(document.getElementById('font-info-content'), fontInfo);

    if (this.container) {
      this.container.style.fontFamily = `"${fontFamily}"`;
    }

    this.openTypeFeatures.clear();
    this.openTypeFeatures.extractFeatures(fontInfo, font, buffer);
    this.openTypeFeatures.createButtons();

    if (fontInfo.axes.length > 0) {
      this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances);
    }

    this.loadedFont = font;
    void this.loadWordList(font).then(() => { void this.start(); });
  }

  async start(interval: number = this.animationDelay): Promise<void> {
    if (this.animationTimer !== null) clearTimeout(this.animationTimer);
    if (this.fadeTimer      !== null) clearTimeout(this.fadeTimer);

    this.isAnimating    = true;
    this.animationDelay = interval;

    if (this.wordList.length === 0) {
      await this.loadWordList(this.loadedFont);
    }

    this.container?.classList.remove('fade-out');
    await this.updateWord();
    this.scheduleNextUpdate();
  }

  stop(): void {
    this.isAnimating = false;
    if (this.animationTimer !== null) { clearTimeout(this.animationTimer); this.animationTimer = null; }
    if (this.fadeTimer      !== null) { clearTimeout(this.fadeTimer);      this.fadeTimer      = null; }
    this.container?.classList.remove('fade-out');
  }

  private scheduleNextUpdate(): void {
    if (this.animationTimer !== null) clearTimeout(this.animationTimer);
    if (!this.isAnimating) return;

    this.animationTimer = setTimeout(() => {
      void this.updateWord();
      this.scheduleNextUpdate();
    }, this.animationDelay);
  }

  private updateWord(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.container?.classList.add('fade-out');

      this.fadeTimer = setTimeout(() => {
        // Guard against the timer firing after stop() was called
        if (this.isAnimating) {
          this.renderEntry(this.historyAdvance());
        }
        this.container?.classList.remove('fade-out');
        resolve();
      }, 300);
    });
  }

  private getRandomWord(): WordEntry {
    const idx = Math.floor(Math.random() * this.processedWordList.length);
    return this.processedWordList[idx] ?? { word: 'Typography', lang: 'en' };
  }

  destroy(): void {
    this.stop();
    document.removeEventListener('keydown', this._keyHandler);
    window.removeEventListener('resize', this._resizeHandler);
    this.uiControls.destroy();
    this.dragAndDrop.destroy();
  }
}

// ---------------------------------------------------------------------------
// Standalone bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const app = new WordAnimator();
  initAppNav();
  void app.fontLoader.restoreFromSession();
});

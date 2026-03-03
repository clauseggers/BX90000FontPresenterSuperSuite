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

export class WordAnimator {
  public readonly fontLoader: FontLoader;

  private readonly uiControls:      UIControls;
  private readonly dragAndDrop:     DragAndDrop;
  private readonly textFitter:      TextFitter;
  private readonly openTypeFeatures: OpenTypeFeatures;
  private readonly variationAxes:   VariationAxes;
  private readonly container:       HTMLElement | null;

  private wordList:                string[] = [];
  private processedWordList:       string[] = [];
  private animationTimer:          ReturnType<typeof setTimeout> | null = null;
  private fadeTimer:               ReturnType<typeof setTimeout> | null = null;
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
    void this.loadWordList();
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
      case 'f':
        this.uiControls.toggleFullscreen();
        break;
    }
  }

  private async loadWordList(): Promise<void> {
    try {
      const response = await fetch('word_lists/euro_words.txt');
      const text     = await response.text();
      this.wordList  = text.split('\n').filter(word => word.trim().length > 0);
      this.processWordList();
    } catch {
      this.wordList         = ['OpenType', 'Features', 'Typography', 'Design'];
      this.processedWordList = this.wordList;
    }
  }

  private processWordList(): void {
    this.processedWordList = this.wordList.map(word => {
      if (word === word.toLowerCase()) {
        const random = Math.random();
        if (random < 0.15) return word.toUpperCase();
        if (random < 0.50) return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
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

    void this.start();
  }

  async start(interval: number = this.animationDelay): Promise<void> {
    if (this.animationTimer !== null) clearTimeout(this.animationTimer);
    if (this.fadeTimer      !== null) clearTimeout(this.fadeTimer);

    this.isAnimating    = true;
    this.animationDelay = interval;

    if (this.wordList.length === 0) {
      await this.loadWordList();
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
        if (this.isAnimating && this.container) {
          const word        = this.getRandomWord();
          const wordElement = document.createElement('div');
          wordElement.textContent                  = word;
          wordElement.style.whiteSpace             = 'nowrap';
          wordElement.style.fontFeatureSettings    = this.openTypeFeatures.getFeatureString();
          wordElement.style.fontVariationSettings  = this.currentVariationSettings;

          this.container.innerHTML = '';
          this.container.appendChild(wordElement);
          this.textFitter.fitText(wordElement, this.container);
        }
        this.container?.classList.remove('fade-out');
        resolve();
      }, 300);
    });
  }

  private getRandomWord(): string {
    const idx  = Math.floor(Math.random() * this.processedWordList.length);
    return this.processedWordList[idx] ?? 'Typography';
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

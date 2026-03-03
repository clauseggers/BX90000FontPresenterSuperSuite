// =============================================================================
// galleyproof/GalleyProof.ts
// =============================================================================

import { FontLoader }       from '../core/FontLoader.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { UIControls }       from '../shared/UIControls.js';
import { DragAndDrop }      from '../shared/DragAndDrop.js';
import { OpenTypeFeatures } from '../wordmaster/OpenTypeFeatures.js';
import { VariationAxes }    from '../shared/VariationAxes.js';
import { initAppNav }       from '../shared/AppNav.js';
import type { FontLoadResult } from '../core/Types.js';

export class GalleyProof {
  public readonly fontLoader: FontLoader;

  private readonly uiControls:       UIControls;
  private readonly dragAndDrop:      DragAndDrop;
  private readonly openTypeFeatures: OpenTypeFeatures;
  private readonly variationAxes:    VariationAxes;
  private readonly container:        HTMLElement | null;

  private currentVariationSettings = 'normal';

  private readonly _keyHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.container = document.getElementById('galley');
    if (this.container) {
      this.container.style.width            = '100%';
      this.container.style.height           = '100%';
      this.container.style.position         = 'relative';
      this.container.style.overflow         = 'auto';
      this.container.style.scrollbarWidth   = 'none';
      this.container.style.msOverflowStyle  = 'none';
      this.container.style.display          = 'flex';
      this.container.style.justifyContent   = 'center';
    }

    this.openTypeFeatures = new OpenTypeFeatures((featureString) => {
      this.updateFeatures(featureString);
    });

    this.uiControls = new UIControls();

    this.fontLoader = new FontLoader({
      onFontLoaded: (result) => { this.handleFontLoaded(result); },
    });

    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop:   (buffer, filename) => {
        void this.fontLoader.loadFont(buffer, filename);
      },
    });

    this.variationAxes = new VariationAxes({
      container: document.getElementById('controls') as HTMLElement,
      onChange:  (settings) => {
        this.currentVariationSettings = settings;
        const firstChild = this.container?.firstChild as HTMLElement | null;
        if (firstChild) firstChild.style.fontVariationSettings = settings;
      },
    });

    this._keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'f') this.uiControls.toggleFullscreen();
    };

    this.setupEventListeners();
    this.initializeSliders();
  }

  // ---------------------------------------------------------------------------
  // Sliders
  // ---------------------------------------------------------------------------

  private initializeSliders(): void {
    const sliders = document.querySelectorAll<HTMLElement>('.slider-container');

    // Font size slider
    this.initSlider(
      sliders[0],
      { min: '0.3', max: '8', step: '0.01', initial: 1 },
      (val, display) => {
        display.textContent = `${val}rem`;
      },
      (val) => {
        document.documentElement.style.setProperty('--galley-font-size', `${val}rem`);
      },
      (val) => `${val}rem`,
      parseFloat,
    );

    // Leading slider
    this.initSlider(
      sliders[1],
      { min: '0.5', max: '4', step: '0.01', initial: 1.2 },
      (val, display) => {
        display.textContent = `${val.toFixed(2)}×`;
      },
      (val) => {
        const firstChild = this.container?.firstChild as HTMLElement | null;
        if (firstChild) firstChild.style.lineHeight = String(val);
      },
      (val) => `${val.toFixed(2)}×`,
      parseFloat,
    );

    // Column width slider
    this.initSlider(
      sliders[2],
      { min: '20', max: '100', step: '1', initial: 60 },
      (val, display) => {
        display.textContent = `${val}%`;
      },
      (val) => {
        const firstChild = this.container?.firstChild as HTMLElement | null;
        if (firstChild) firstChild.style.width = `${val}%`;
      },
      (val) => `${val}%`,
      parseInt,
    );

    // Letter spacing slider
    this.initSlider(
      sliders[3],
      { min: '-0.2', max: '0.5', step: '0.001', initial: 0 },
      (val, display) => {
        display.textContent = `${val.toFixed(3)} em`;
      },
      (val) => {
        const firstChild = this.container?.firstChild as HTMLElement | null;
        if (firstChild) firstChild.style.letterSpacing = `${val}em`;
      },
      (val) => `${val.toFixed(3)} em`,
      parseFloat,
    );

    // Word spacing slider
    this.initSlider(
      sliders[4],
      { min: '-1', max: '2', step: '0.001', initial: 0 },
      (val, display) => {
        display.textContent = `${val.toFixed(3)} em`;
      },
      (val) => {
        const firstChild = this.container?.firstChild as HTMLElement | null;
        if (firstChild) firstChild.style.wordSpacing = `${val}em`;
      },
      (val) => `${val.toFixed(3)} em`,
      parseFloat,
    );
  }

  /** Generic slider wiring helper. */
  private initSlider<T extends number>(
    container: HTMLElement | undefined,
    config: { min: string; max: string; step: string; initial: T },
    onDisplay: (val: T, display: HTMLElement) => void,
    onApply:   (val: T) => void,
    formatInitial: (val: T) => string,
    parse: (s: string, radix?: number) => T,
  ): void {
    if (!container) return;
    const slider  = container.querySelector<HTMLInputElement>('input[type="range"]');
    const display = container.querySelector<HTMLElement>('.value');
    if (!slider) return;

    slider.min   = config.min;
    slider.max   = config.max;
    slider.step  = config.step;
    slider.value = String(config.initial);
    if (display) display.textContent = formatInitial(config.initial);

    slider.addEventListener('input', () => {
      const val = parse(slider.value, 10) as T;
      if (display) onDisplay(val, display);
      onApply(val);
    });
  }

  // ---------------------------------------------------------------------------
  // Setup / teardown
  // ---------------------------------------------------------------------------

  private setupEventListeners(): void {
    this.uiControls.setupSharedButtons();
    document.addEventListener('keydown', this._keyHandler);
  }

  // ---------------------------------------------------------------------------
  // Text loading
  // ---------------------------------------------------------------------------

  private async loadText(): Promise<void> {
    try {
      const response  = await fetch('word_lists/kongens_fald_html.txt');
      const innerHTML = await response.text();

      if (!this.container) return;

      if (!this.container.firstChild) {
        const textEl        = document.createElement('div');
        textEl.innerHTML    = innerHTML;
        textEl.style.width  = '60%';
        textEl.style.fontSize   = '1rem';
        textEl.style.lineHeight = '1.5';
        this.container.appendChild(textEl);
      } else {
        (this.container.firstChild as HTMLElement).innerHTML = innerHTML;
      }
    } catch (err) {
      console.error('Error loading text:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Font loaded
  // ---------------------------------------------------------------------------

  private handleFontLoaded({ font, fontInfo, fontFamily, buffer }: FontLoadResult): void {
    FontInfoRenderer.renderFontInfo(document.getElementById('font-info-content'), fontInfo);

    void this.loadText().then(() => {
      const textEl = this.container?.firstChild as HTMLElement | null;
      if (textEl) {
        textEl.style.fontFamily             = `"${fontFamily}"`;
        textEl.style.fontFeatureSettings    = 'normal';
        textEl.style.fontVariationSettings  = this.currentVariationSettings;
        textEl.style.letterSpacing          = '0em';
        textEl.style.wordSpacing            = '0em';
        textEl.style.lineHeight             = '1.20';

        // Reset slider displays
        const sliders = document.querySelectorAll<HTMLElement>('.slider-container');

        const resetSlider = (
          container: HTMLElement | undefined,
          value: string,
          label: string,
        ) => {
          if (!container) return;
          const s = container.querySelector<HTMLInputElement>('input[type="range"]');
          const v = container.querySelector<HTMLElement>('.value');
          if (s) s.value     = value;
          if (v) v.textContent = label;
        };

        resetSlider(sliders[1], '1.20', '1.20×');
        resetSlider(sliders[3], '0',    '0 em');
        resetSlider(sliders[4], '0',    '0 em');
      }
    });

    this.openTypeFeatures.clear();
    this.openTypeFeatures.extractFeatures(fontInfo, font, buffer);
    this.openTypeFeatures.createButtons();

    if (fontInfo.axes.length > 0) {
      this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances);
    }
  }

  private updateFeatures(featureString: string): void {
    const firstChild = this.container?.firstChild as HTMLElement | null;
    if (firstChild) firstChild.style.fontFeatureSettings = featureString;
  }

  destroy(): void {
    document.removeEventListener('keydown', this._keyHandler);
    this.uiControls.destroy();
    this.dragAndDrop.destroy();
  }
}

// ---------------------------------------------------------------------------
// Standalone bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const app = new GalleyProof();
  initAppNav();
  void app.fontLoader.restoreFromSession();
});

/**
 * TurboTiler.ts
 * Main controller for TurboTiler BX90000 Fascination
 */

import { FontLoader }   from '../core/FontLoader.js';
import { UIControls }   from '../shared/UIControls.js';
import { DragAndDrop }  from '../shared/DragAndDrop.js';
import { GlyphGrid }    from './GlyphGrid.js';
import { GridAnimator } from './GridAnimator.js';
import { initAppNav }   from '../shared/AppNav.js';
import type { FontLoadResult, AxisDefinition } from '../core/Types.js';

export class TurboTiler {
  public readonly fontLoader: FontLoader;

  private readonly uiControls:    UIControls;
  private readonly dragAndDrop:   DragAndDrop;
  private readonly glyphGrid:     GlyphGrid;
  private readonly gridAnimator:  GridAnimator;
  private readonly zoomContainer: HTMLElement;
  private readonly gridContainer: HTMLElement;

  private currentFont:       opentype.Font | null = null;
  private currentFontFamily  = '';
  private resizeTimeouts:    ReturnType<typeof setTimeout>[] | null = null;

  private readonly _keyHandler:    (e: KeyboardEvent) => void;
  private readonly _resizeHandler: () => void;

  constructor() {
    const zoomContainer  = document.getElementById('zoom-container') as HTMLElement;
    const gridContainer  = document.getElementById('grid-container') as HTMLElement;
    this.zoomContainer   = zoomContainer;
    this.gridContainer   = gridContainer;

    this.glyphGrid    = new GlyphGrid();
    this.gridAnimator = new GridAnimator(gridContainer, this.glyphGrid);

    this.fontLoader = new FontLoader({
      onFontLoaded: (result) => { this.handleFontLoaded(result); },
      onError:      (err)    => { this.handleError(err); },
    });

    this.uiControls = new UIControls();

    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop:   (buffer) => { this.handleFontDrop(buffer); },
    });

    this._keyHandler    = (e) => { this.handleKeyPress(e); };
    this._resizeHandler = () => { this.handleResize(); };

    this.setupEventListeners();
    console.log('TurboTiler initialized');
  }

  // ---------------------------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------------------------

  private setupEventListeners(): void {
    this.uiControls.setupSharedButtons();
    document.addEventListener('keydown',             this._keyHandler);
    window.addEventListener('resize',                this._resizeHandler);
    document.addEventListener('fullscreenchange',         this._resizeHandler);
    document.addEventListener('webkitfullscreenchange',   this._resizeHandler);
    document.addEventListener('mozfullscreenchange',      this._resizeHandler);
    document.addEventListener('MSFullscreenChange',       this._resizeHandler);
  }

  private handleKeyPress(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'f':
        this.uiControls.toggleFullscreen();
        break;
      case ' ':
        event.preventDefault();
        if (this.gridAnimator.isPaused) {
          this.gridAnimator.resume();
        } else {
          this.gridAnimator.pause();
        }
        break;
    }
  }

  private handleResize(): void {
    if (!this.fontLoader.currentFont) return;
    this.scheduleViewportRebuilds();
  }

  private scheduleViewportRebuilds(): void {
    if (this.resizeTimeouts) {
      this.resizeTimeouts.forEach(id => clearTimeout(id));
    }
    const delays = [120, 450, 900];
    this.resizeTimeouts = delays.map(delay =>
      setTimeout(() => { this.rebuildForViewportChange(); }, delay),
    );
  }

  private rebuildForViewportChange(): void {
    if (!this.fontLoader.currentFont) return;

    const initialWidth  = window.innerWidth;
    const initialHeight = window.innerHeight;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.innerWidth !== initialWidth || window.innerHeight !== initialHeight) {
          this.rebuildForViewportChange();
          return;
        }
        this.syncZoomOutScaleToViewport();
        this.gridAnimator.pause();
        this.gridAnimator.reset();
        this.populateGrid();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { this.gridAnimator.start(); });
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Font drop
  // ---------------------------------------------------------------------------

  private handleFontDrop(arrayBuffer: ArrayBuffer): void {
    console.log('Font file dropped, loading...');
    if (this.resizeTimeouts) {
      this.resizeTimeouts.forEach(id => clearTimeout(id));
      this.resizeTimeouts = null;
    }
    this.gridAnimator.pause();
    this.gridAnimator.reset();
    void this.fontLoader.loadFont(arrayBuffer);
  }

  // ---------------------------------------------------------------------------
  // Font loaded
  // ---------------------------------------------------------------------------

  private handleFontLoaded({ font, fontInfo, fontFamily }: FontLoadResult): void {
    console.log(`Font loaded: ${font.names.fullName?.['en'] ?? 'Unknown'}`);
    console.log(`Unique family name: ${fontFamily}`);

    this.currentFont       = font;
    this.currentFontFamily = fontFamily;

    const glyphList = this.extractGlyphs(font);
    const axes      = this.extractAxes(font);
    const features  = this.extractFeatures(font);

    console.log(`Extracted ${glyphList.length} glyphs`);
    if (axes.length    > 0) console.log(`Found ${axes.length} variable font axes:`,    axes.map(a => a.tag));
    if (features.length > 0) console.log(`Found ${features.length} OpenType features:`, features);

    this.syncZoomOutScaleToViewport();
    this.gridAnimator.pause();
    this.gridAnimator.reset();

    this.glyphGrid.populate(
      this.gridContainer,
      glyphList,
      axes,
      features,
      fontFamily,
      font,
      this.gridAnimator.zoomScale.min,
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { this.gridAnimator.start(); });
    });
  }

  private handleError(error: Error): void {
    console.error('Font loading error:', error);
    alert(`Error loading font: ${error.message}\nPlease check the console for details.`);
  }

  // ---------------------------------------------------------------------------
  // Font data extraction
  // ---------------------------------------------------------------------------

  private extractGlyphs(font: opentype.Font): string[] {
    const glyphs: string[]  = [];
    const excluded = /[\p{White_Space}\p{M}\p{Diacritic}\p{C}]/u;

    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);
      if (glyph.name === '.notdef' || glyph.unicode === undefined) continue;

      const char = String.fromCodePoint(glyph.unicode);
      if (excluded.test(char)) continue;
      glyphs.push(char);
    }

    return glyphs.length > 0 ? glyphs : ['A'];
  }

  private extractAxes(font: opentype.Font): AxisDefinition[] {
    const axes: AxisDefinition[] = [];
    if (font.tables.fvar?.axes) {
      for (const axis of font.tables.fvar.axes) {
        axes.push({
          tag:     axis.tag,
          name:    axis.name?.['en'] ?? axis.tag,
          min:     axis.minValue,
          max:     axis.maxValue,
          default: axis.defaultValue,
        });
      }
    }
    return axes;
  }

  private extractFeatures(font: opentype.Font): string[] {
    const features = new Set<string>();
    if (font.tables.gsub?.features) {
      for (const feature of font.tables.gsub.features) {
        features.add(feature.tag);
      }
    }
    return Array.from(features);
  }

  // ---------------------------------------------------------------------------
  // Grid repopulation
  // ---------------------------------------------------------------------------

  private populateGrid(): void {
    if (!this.currentFont) return;
    this.syncZoomOutScaleToViewport();
    this.glyphGrid.populate(
      this.gridContainer,
      this.extractGlyphs(this.currentFont),
      this.extractAxes(this.currentFont),
      this.extractFeatures(this.currentFont),
      this.currentFontFamily,
      this.currentFont,
      this.gridAnimator.zoomScale.min,
    );
  }

  private syncZoomOutScaleToViewport(): void {
    this.gridAnimator.zoomScale.min = 0.19;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.resizeTimeouts) {
      this.resizeTimeouts.forEach(id => clearTimeout(id));
      this.resizeTimeouts = null;
    }
    this.gridAnimator.pause();
    this.gridAnimator.reset();
    document.removeEventListener('keydown',             this._keyHandler);
    window.removeEventListener('resize',                this._resizeHandler);
    document.removeEventListener('fullscreenchange',         this._resizeHandler);
    document.removeEventListener('webkitfullscreenchange',   this._resizeHandler);
    document.removeEventListener('mozfullscreenchange',      this._resizeHandler);
    document.removeEventListener('MSFullscreenChange',       this._resizeHandler);
    this.uiControls.destroy();
    this.dragAndDrop.destroy();
  }
}

// ---------------------------------------------------------------------------
// Standalone bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const app = new TurboTiler();
  initAppNav();
  void app.fontLoader.restoreFromSession();
});

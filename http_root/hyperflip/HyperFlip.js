// =============================================================================
// HyperFlip.js
// =============================================================================

import { FontLoader } from '../core/FontLoader.js';
import { saveHyperFlipState, getSavedHyperFlipState } from '../shared/FontSession.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { GlyphAnimator } from './GlyphAnimator.js';
import { MetricsOverlay } from '../shared/MetricsOverlay.js';
import { VariationAxes } from '../shared/VariationAxes.js';
import { UIControls } from '../shared/UIControls.js';
import { DragAndDrop } from '../shared/DragAndDrop.js';
import { initAppNav } from '../shared/AppNav.js';

class FontViewer {
  constructor() {
    this.initializeComponents();
    this.setupEventListeners();
  }

  initializeComponents() {
    // Initialize core components
    this.fontLoader = new FontLoader({
      onFontLoaded: this.handleFontLoaded.bind(this),
      onError: this.handleError.bind(this)
    });

    // Initialize UI components
    this.glyphAnimator = new GlyphAnimator({
      displayElement: document.querySelector('.glyph-buffer'),
      onGlyphChange: this.handleGlyphChange.bind(this)
    });

    this.metricsOverlay = new MetricsOverlay(
      document.getElementById('font-metrics-overlay')
    );

    this.variationAxes = new VariationAxes({
      container: document.getElementById('controls'),
      onChange: this.handleAxesChange.bind(this)
    });

    this.uiControls = new UIControls();

    // Note: We're now using document.body as the dropZone
    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop: this.handleFontDrop.bind(this)
    });
  }

  setupEventListeners() {
    this.uiControls.setupSharedButtons();

    // Add resize observer to handle window resizes and fullscreen changes
    this._resizeObserver = new ResizeObserver(() => {
      if (this.metricsOverlay.isVisible) {
        this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
      }
    });

    // Observe the display container
    const displayContainer = document.querySelector('.display-container');
    if (displayContainer) {
      this._resizeObserver.observe(displayContainer);
    }

    // Glyph info toggle
    const glyphInfoToggle = document.getElementById('glyph-info-toggle');
    if (glyphInfoToggle) {
      glyphInfoToggle.addEventListener('click', () => {
        const glyphInfo = document.getElementById('glyph-info');
        if (!glyphInfo) return;

        const isVisible = glyphInfo.style.display !== 'none';
        glyphInfo.style.display = isVisible ? 'none' : 'block';
        glyphInfoToggle.textContent = isVisible ? 'Show glyph info' : 'Hide glyph info';
      });
    }

    // Randomise button
    const randomiseButton = document.getElementById('randomise-button');
    if (randomiseButton) {
      randomiseButton.addEventListener('click', () => {
        if (this.glyphAnimator) {
          this.glyphAnimator.toggleOrder();
          randomiseButton.textContent = this.glyphAnimator.isRandomOrder ?
          'Sequential glyph order' : 'Randomise glyph order';
        }
      });
    }

    // Metrics toggle
    const metricsToggle = document.getElementById('metrics-toggle');
    if (metricsToggle) {
      metricsToggle.addEventListener('click', () => {
        this.metricsOverlay.toggle();
        metricsToggle.textContent = this.metricsOverlay.isVisible ? 'Hide metrics' : 'Show metrics';
      });
    }

    // Keyboard controls — save reference for cleanup in destroy().
    this._keyHandler = this.handleKeyPress.bind(this);
    document.addEventListener('keydown', this._keyHandler);

    // Slider controls
    this.setupSliderControls();
  }

  setupSliderControls() {
    // Font size slider
    const fontSizeSlider = document.getElementById('font-size');
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const newSize = e.target.value;
        this.glyphAnimator.displayElement.style.fontSize = `${newSize}px`;
        e.target.nextElementSibling.textContent = `${newSize}px`;

        // Update metrics overlay when font size changes
        if (this.metricsOverlay.isVisible) {
          this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
        }
      });
    }

    // Animation delay slider
    const speedSlider = document.getElementById('animation-delay');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const newInterval = parseInt(e.target.value);
        e.target.nextElementSibling.textContent = `${newInterval}ms`;

        if (this.glyphAnimator.isAnimating) {
          this.glyphAnimator.stop();
          this.glyphAnimator.start(newInterval);
        }
      });
    }

    // Vertical position slider
    const verticalPositionSlider = document.getElementById('vertical-position');
    if (verticalPositionSlider) {
      verticalPositionSlider.addEventListener('input', (e) => {
        const reversedPosition = e.target.max - e.target.value;
        this.glyphAnimator.displayElement.style.top = `${reversedPosition - 50}%`;
        e.target.nextElementSibling.textContent = `${reversedPosition}%`;

        // Update metrics overlay when vertical position changes
        if (this.metricsOverlay.isVisible) {
          this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
        }
      });
    }
  }

  async handleFontDrop(buffer, filename) {
    try {
      // Remove the drop text
      const dropText = document.getElementById('drop-text');
      if (dropText && dropText.parentNode) {
        dropText.parentNode.removeChild(dropText);
      }

      // Clear any saved HyperFlip state so fresh font starts clean.
      saveHyperFlipState(null);

      const { font, fontInfo, fontFamily } = await this.fontLoader.loadFont(buffer, filename);
      this.handleFontLoaded({ font, fontInfo, fontFamily });
    } catch (error) {
      this.handleError(error);
    }
  }

  handleFontLoaded({ font, fontInfo, fontFamily }) {
    // Update display settings
    const display = document.querySelector('.glyph-buffer');
    display.style.fontFamily = `"${fontFamily}"`;
    display.style.fontSize = '600px';  // Set initial size to match slider

    // Update font info panel
    const fontInfoContent = document.getElementById('font-info-content');
    FontInfoRenderer.renderFontInfo(fontInfoContent, fontInfo);

    // Setup variable font axes
    if (fontInfo.axes?.length > 0) {
      this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances || []);
    }

    // Start glyph animation with the correct font
    try {
      this.glyphAnimator.setGlyphsFromFont(font)
      .then(() => {
        // Restore UI state (toggle settings + glyph position) from the previous visit.
        // Must happen before start() so the animation delay and font size are correct.
        this._restoreHyperFlipState(getSavedHyperFlipState());
        const delay = parseInt(document.getElementById('animation-delay')?.value || 500);
        this.glyphAnimator.start(delay);
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  handleGlyphChange(glyph) {
    // Update glyph info panel
    const glyphInfoContent = document.getElementById('glyph-info-content');
    FontInfoRenderer.renderGlyphInfo(glyphInfoContent, this.fontLoader.currentFont, glyph);

    // Update metrics overlay if visible
    this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
  }

  handleError(error) {
    console.error('Font loading error:', error);
    alert(`Error loading font: ${error.message}`);
  }

  handleAxesChange(settings) {
    const displayElement = document.querySelector('.glyph-buffer');
    displayElement.style.fontVariationSettings = settings;

    // Just trigger a metrics overlay update - the browser will handle the variations
    if (this.metricsOverlay.isVisible) {
      this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
    }
  }

  handleKeyPress(event) {
    switch(event.key) {
      case ' ':
      event.preventDefault();
      this.glyphAnimator.isAnimating ?
      this.glyphAnimator.stop() :
      this.glyphAnimator.start(parseInt(document.getElementById('animation-delay')?.value || 100));
      break;
      case 'f':
      this.uiControls.toggleFullscreen();
      break;
      case 'ArrowLeft':
      case 'h':
      this.glyphAnimator.stop();
      this.glyphAnimator.moveBack(10);
      break;
      case 'j':
      case 'ArrowDown':
      this.glyphAnimator.stop();
      this.glyphAnimator.moveBack(1);
      break;
      case 'ArrowRight':
      case 'l':
      this.glyphAnimator.stop();
      this.glyphAnimator.moveForward(10);
      break;
      case 'k':
      case 'ArrowUp':
      this.glyphAnimator.stop();
      this.glyphAnimator.moveForward(1);
      break;
    }
  }

  /**
   * Captures the current toggle states and glyph position into sessionStorage so
   * they can be restored when the user returns to this page.
   * Only writes state when a font is actually loaded.
   */
  _saveHyperFlipState() {
    if (!this.fontLoader.currentFont) return;
    const glyphInfo = document.getElementById('glyph-info');
    const fontSizeSlider        = document.getElementById('font-size');
    const verticalPositionSlider = document.getElementById('vertical-position');
    const animationDelaySlider  = document.getElementById('animation-delay');
    saveHyperFlipState({
      isRandomOrder:      this.glyphAnimator.isRandomOrder,
      isMetricsVisible:   this.metricsOverlay.isVisible,
      isGlyphInfoVisible: glyphInfo ? glyphInfo.style.display !== 'none' : false,
      glyphIndex:         this.glyphAnimator.currentIndex,
      fontSize:           fontSizeSlider         ? parseInt(fontSizeSlider.value)         : null,
      verticalPosition:   verticalPositionSlider  ? parseInt(verticalPositionSlider.value)  : null,
      animationDelay:     animationDelaySlider    ? parseInt(animationDelaySlider.value)    : null,
    });
  }

  /**
   * Applies a previously saved HyperFlip state to the UI and animator.
   * Must be called after setGlyphsFromFont() and before start().
   * @param {{ isRandomOrder: boolean, isMetricsVisible: boolean, isGlyphInfoVisible: boolean, glyphIndex: number } | null} state
   */
  _restoreHyperFlipState(state) {
    if (!state) return;

    // Randomise order — toggleOrder() shuffles and resets currentIndex to 0.
    if (state.isRandomOrder) {
      this.glyphAnimator.toggleOrder();
      const btn = document.getElementById('randomise-button');
      if (btn) btn.textContent = 'Sequential glyph order';
    }

    // Glyph position — only meaningful for sequential order; random always
    // starts from a freshly shuffled position 0 (set above by toggleOrder).
    if (!state.isRandomOrder && state.glyphIndex > 0) {
      this.glyphAnimator.currentIndex = Math.min(
        state.glyphIndex,
        this.glyphAnimator.glyphs.length - 1
      );
    }

    // Metrics overlay
    if (state.isMetricsVisible) {
      this.metricsOverlay.toggle();
      const btn = document.getElementById('metrics-toggle');
      if (btn) btn.textContent = 'Hide metrics';
    }

    // Glyph info panel
    if (state.isGlyphInfoVisible) {
      const glyphInfo = document.getElementById('glyph-info');
      if (glyphInfo) glyphInfo.style.display = 'block';
      const btn = document.getElementById('glyph-info-toggle');
      if (btn) btn.textContent = 'Hide glyph info';
    }

    // Font size slider
    if (state.fontSize != null) {
      const slider = document.getElementById('font-size');
      if (slider) {
        slider.value = state.fontSize;
        slider.nextElementSibling.textContent = `${state.fontSize}px`;
        this.glyphAnimator.displayElement.style.fontSize = `${state.fontSize}px`;
      }
    }

    // Vertical position slider
    if (state.verticalPosition != null) {
      const slider = document.getElementById('vertical-position');
      if (slider) {
        slider.value = state.verticalPosition;
        const reversedPosition = parseInt(slider.max) - state.verticalPosition;
        slider.nextElementSibling.textContent = `${reversedPosition}%`;
        this.glyphAnimator.displayElement.style.top = `${reversedPosition - 50}%`;
      }
    }

    // Animation delay slider
    if (state.animationDelay != null) {
      const slider = document.getElementById('animation-delay');
      if (slider) {
        slider.value = state.animationDelay;
        slider.nextElementSibling.textContent = `${state.animationDelay}ms`;
        // The animator is started with this delay right after _restoreHyperFlipState returns,
        // so we just update the slider's own interval reference here.
        this.glyphAnimator.interval = state.animationDelay;
      }
    }
  }

  // Stop animation and remove all document-level event listeners.
  destroy() {
    // Persist current state before the DOM is torn down.
    this._saveHyperFlipState();
    this.glyphAnimator.stop();
    document.removeEventListener('keydown', this._keyHandler);
    this._resizeObserver?.disconnect();
    this.uiControls.destroy();
    this.dragAndDrop.destroy();
  }
}

// Standalone (non-SPA) bootstrap — DOMContentLoaded never fires when the
// module is dynamically imported by AppShell, so this is a harmless no-op
// in SPA mode.
document.addEventListener('DOMContentLoaded', () => {
  const app = new FontViewer();
  initAppNav();
  app.fontLoader.restoreFromSession();
});

export default FontViewer;
// =============================================================================
// HyperFlip.js
// =============================================================================

import { FontLoader } from '../core/FontLoader.js';
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

    // Make sure these are after the VariationAxes initialization
    const controls = document.getElementById('controls');
    const buttonsContainer = controls.querySelector('.buttons-container');
    if (!buttonsContainer) {
      console.error('Buttons container not found!');
    }

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

    // Randomize button
    const randomizeButton = document.getElementById('randomize-button');
    if (randomizeButton) {
      randomizeButton.addEventListener('click', () => {
        if (this.glyphAnimator) {
          this.glyphAnimator.toggleOrder();
          randomizeButton.textContent = this.glyphAnimator.isRandomOrder ?
          'Sequential glyph order' : 'Randomize glyph order';
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
        this.glyphAnimator.start(100);
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

  // Stop animation and remove all document-level event listeners.
  destroy() {
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
// =============================================================================
// galleyproof/GalleyProof.js
// =============================================================================

import { DragAndDrop } from '../shared/DragAndDrop.js';
import { FontLoader } from '../core/FontLoader.js';
import { UIControls } from '../shared/UIControls.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { OpenTypeFeatures } from '../wordmaster/OpenTypeFeatures.js';
import { VariationAxes } from '../shared/VariationAxes.js';
import { initAppNav } from '../shared/AppNav.js';

class GalleyProof {
  constructor() {
    this.container = document.getElementById('galley');
    if (this.container) {
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.position = 'relative';
      this.container.style.overflow = 'auto';
      this.container.style.scrollbarWidth = 'none';
      this.container.style.msOverflowStyle = 'none';
      this.container.style.display = 'flex';
      this.container.style.justifyContent = 'center';
    }

    this.textContent = '';
    this.currentVariationSettings = 'normal';

    this.openTypeFeatures = new OpenTypeFeatures();
    this.uiControls = new UIControls();

    this.fontLoader = new FontLoader({
      onFontLoaded: this.handleFontLoaded.bind(this)
    });

    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop: (buffer, filename) => {
        this.fontLoader.loadFont(buffer, filename);
      }
    });

    this.variationAxes = new VariationAxes({
      container: document.getElementById('controls'),
      onChange: (settings) => {
        this.currentVariationSettings = settings;
        if (this.container.firstChild) {
          this.container.firstChild.style.fontVariationSettings = settings;
        }
      }
    });

    this.setupEventListeners();
    this.initializeSliders();

    this.openTypeFeatures = new OpenTypeFeatures((featureString) => {
      this.updateFeatures(featureString);
    });
  }

  initializeSliders() {
    const sliders = document.querySelectorAll('.slider-container');

    // Font size slider
    const sizeContainer = sliders[0];
    const sizeSlider = sizeContainer?.querySelector('input[type="range"]');
    const sizeValue = sizeContainer?.querySelector('.value');

    if (sizeSlider) {
      sizeSlider.min = "0.3";
      sizeSlider.max = "8";
      sizeSlider.step = "0.01";
      const initialSize = 1;
      sizeSlider.value = initialSize.toString();

      if (sizeValue) {
        sizeValue.textContent = `${initialSize}rem`;
      }
    }

    sizeSlider?.addEventListener('input', (e) => {
      const fontSize = parseFloat(e.target.value);
      if (sizeValue) {
        sizeValue.textContent = `${fontSize}rem`;
      }
      if (this.container.firstChild) {
        document.documentElement.style.setProperty('--galley-font-size', `${fontSize}rem`);
      }
    });

    // Leading slider
    const leadingContainer = sliders[1];
    const leadingSlider = leadingContainer?.querySelector('input[type="range"]');
    const leadingValue = leadingContainer?.querySelector('.value');

    if (leadingSlider) {
      leadingSlider.min = "0.5";
      leadingSlider.max = "4";
      leadingSlider.step = "0.01";
      const initialLeading = 1.2;
      leadingSlider.value = initialLeading.toString();

      if (leadingValue) {
        leadingValue.textContent = `${initialLeading.toFixed(2)}×`;
      }
    }

    leadingSlider?.addEventListener('input', (e) => {
      const leading = parseFloat(e.target.value);
      if (leadingValue) {
        leadingValue.textContent = `${leading.toFixed(2)}×`;
      }
      if (this.container.firstChild) {
        this.container.firstChild.style.lineHeight = leading;
      }
    });

    // Column width slider
    const widthContainer = sliders[2];
    const widthSlider = widthContainer?.querySelector('input[type="range"]');
    const widthValue = widthContainer?.querySelector('.value');

    if (widthSlider) {
      widthSlider.min = "20";
      widthSlider.max = "100";
      const initialWidth = 60;
      widthSlider.value = initialWidth.toString();

      if (widthValue) {
        widthValue.textContent = `${initialWidth}%`;
      }
    }

    widthSlider?.addEventListener('input', (e) => {
      const width = parseInt(e.target.value);
      if (widthValue) {
        widthValue.textContent = `${width}%`;
      }
      if (this.container.firstChild) {
        this.container.firstChild.style.width = `${width}%`;
      }
    } );

    // Letter spacing slider
    const letterSpacingContainer = sliders[3];
    const letterSpacingSlider = letterSpacingContainer?.querySelector('input[type="range"]');
    const letterSpacingValue = letterSpacingContainer?.querySelector('.value');

    if (letterSpacingSlider) {
      letterSpacingSlider.min = "-0.2";
      letterSpacingSlider.max = "0.5";
      letterSpacingSlider.step = "0.001";
      const initialLetterSpacing = 0;
      letterSpacingSlider.value = initialLetterSpacing.toString();

      if (letterSpacingValue) {
        letterSpacingValue.textContent = `${initialLetterSpacing} em`;
      }
    }

    letterSpacingSlider?.addEventListener('input', (e) => {
      const spacing = parseFloat(e.target.value);
      if (letterSpacingValue) {
        letterSpacingValue.textContent = `${spacing.toFixed(3)} em`;
      }
      if (this.container.firstChild) {
        this.container.firstChild.style.letterSpacing = `${spacing}em`;
      }
    });

    // Word spacing slider
    const wordSpacingContainer = sliders[4];
    const wordSpacingSlider = wordSpacingContainer?.querySelector('input[type="range"]');
    const wordSpacingValue = wordSpacingContainer?.querySelector('.value');

    if (wordSpacingSlider) {
      wordSpacingSlider.min = "-1";
      wordSpacingSlider.max = "2";
      wordSpacingSlider.step = "0.001";
      const initialWordSpacing = 0;
      wordSpacingSlider.value = initialWordSpacing.toString();

      if (wordSpacingValue) {
        wordSpacingValue.textContent = `${initialWordSpacing} em`;
      }
    }

    wordSpacingSlider?.addEventListener('input', (e) => {
      const spacing = parseFloat(e.target.value);
      if (wordSpacingValue) {
        wordSpacingValue.textContent = `${spacing.toFixed(3)} em`;
      }
      if (this.container.firstChild) {
        this.container.firstChild.style.wordSpacing = `${spacing}em`;
      }
    });
  }

  // Method to update spacing when font size changes
  updateSpacing() {
    if (this.container.firstChild) {
      this.container.firstChild.style.letterSpacing = `${this.currentLetterSpacing}em`;
      this.container.firstChild.style.wordSpacing = `${this.currentWordSpacing}em`;
    }
  }

  setupEventListeners() {
    this.uiControls.setupSharedButtons();

    // Keyboard controls — save reference for cleanup in destroy().
    this._keyHandler = (event) => {
      if (event.key === 'f') {
        this.uiControls.toggleFullscreen();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  async loadText() {
    try {
      const response = await fetch('word_lists/kongens_fald_html.txt');
      const htmlContent = await response.text();

      // Create text container if it doesn't exist
      if (!this.container.firstChild) {
        const textElement = document.createElement('div');
        textElement.innerHTML = htmlContent;
        textElement.style.width = '60%';
        textElement.style.fontSize = '1rem';
        textElement.style.lineHeight = '1.5';
        this.container.appendChild(textElement);
      } else {
        this.container.firstChild.innerHTML = htmlContent;
      }
    } catch (error) {
      console.error('Error loading text:', error);
      this.textContent = 'Error loading text. Please ensure kongens_fald_html.txt is available.';
    }
  }

  handleFontLoaded({ font, fontInfo, fontFamily, buffer }) {
    FontInfoRenderer.renderFontInfo(
      document.getElementById('font-info-content'),
      fontInfo
    );

    this.loadText().then(() => {
      const textElement = this.container.firstChild;
      if (textElement) {
        textElement.style.fontFamily = `"${fontFamily}"`;
        textElement.style.fontFeatureSettings = 'normal';
        textElement.style.fontVariationSettings = this.currentVariationSettings;

        // Reset spacing properties to default values
        textElement.style.letterSpacing = '0em';
        textElement.style.wordSpacing = '0em';
        textElement.style.lineHeight = '1.20';

        // Reset slider positions and values
        const sliders = document.querySelectorAll('.slider-container');

        // Reset leading slider and ensure it matches the initial value
        const leadingContainer = sliders[1];
        if (leadingContainer) {
          const slider = leadingContainer.querySelector('input[type="range"]');
          const value = leadingContainer.querySelector('.value');
          if (slider) slider.value = "1.20";
          if (value) value.textContent = "1.20×";
        }

        // Reset letter spacing slider
        const letterSpacingContainer = sliders[3];
        if (letterSpacingContainer) {
          const slider = letterSpacingContainer.querySelector('input[type="range"]');
          const value = letterSpacingContainer.querySelector('.value');
          if (slider) slider.value = "0";
          if (value) value.textContent = "0 em";
        }

        // Reset word spacing slider
        const wordSpacingContainer = sliders[4];
        if (wordSpacingContainer) {
          const slider = wordSpacingContainer.querySelector('input[type="range"]');
          const value = wordSpacingContainer.querySelector('.value');
          if (slider) slider.value = "0";
          if (value) value.textContent = "0 em";
        }
      }
    });

    this.openTypeFeatures.clear();
    this.openTypeFeatures.extractFeatures(fontInfo, font, buffer);
    this.openTypeFeatures.createButtons();

    if (fontInfo.axes) {
      this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances || []);
    }
  }

  updateFeatures(featureString) {
    if (this.container.firstChild) {
      this.container.firstChild.style.fontFeatureSettings = featureString;
    }
  }

  // Remove all document-level event listeners.
  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    this.uiControls.destroy();
    this.dragAndDrop.destroy();
  }
}

// Standalone bootstrap (no-op in SPA mode — DOMContentLoaded won't fire).
document.addEventListener('DOMContentLoaded', () => {
  const app = new GalleyProof();
  initAppNav();
  app.fontLoader.restoreFromSession();
});

export { GalleyProof };
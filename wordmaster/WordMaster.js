// =============================================================================
// wordmaster/WordMaster.js
// =============================================================================

import { FontLoader } from '../core/FontLoader.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { MetricsOverlay } from '../hyperflip/MetricsOverlay.js';
import { VariationAxes } from '../hyperflip/VariationAxes.js';
import { UIControls } from '../shared/UIControls.js';
import { DragAndDrop } from '../shared/DragAndDrop.js';
import { TextFitter } from './TextFitter.js';
import { OpenTypeFeatures } from './OpenTypeFeatures.js';

class WordAnimator {
  constructor(options) {
    this.container = document.getElementById('word');
    if (this.container) {
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.position = 'relative';
    }
    this.wordList = [];
    this.processedWordList = [];
    this.animationTimer = null;
    this.fadeTimer = null;
    this.currentVariationSettings = 'normal';
    this.paddingPercentage = 10;
    this.animationDelay = 3000;
    this.isAnimating = false;

    this.openTypeFeatures = new OpenTypeFeatures((featureString) => {
      this.updateFeatures(featureString);
    });

    this.uiControls = new UIControls();

    this.fontLoader = new FontLoader({
      onFontLoaded: this.handleFontLoaded.bind(this)
    });

    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop: (buffer, filename) => {
        this.stop();
        this.fontLoader.loadFont(buffer, filename);
      }
    });

    this.metricsOverlay = new MetricsOverlay();

    this.textFitter = new TextFitter({
      paddingPercentage: this.paddingPercentage
    });

    this.setupEventListeners();
    this.loadWordList();

    window.addEventListener('resize', () => {
      if (this.container.firstChild) {
        this.textFitter.fitText(this.container.firstChild, this.container);
      }
    });

    this.variationAxes = new VariationAxes({
      container: document.getElementById('controls'),
      onChange: (settings) => {
        if (this.container.firstChild) {
          this.currentVariationSettings = settings;
          this.container.firstChild.style.fontVariationSettings = settings;
        }
      }
    });

    this.initializeSliders();
  }

  updateFeatures(featureString) {
    if (this.container.firstChild) {
      this.container.firstChild.style.fontFeatureSettings = featureString;
      // Re-fit text since some features might affect word width
      this.textFitter.fitText(this.container.firstChild, this.container);
    }
  }

  initializeSliders() {
    const sliders = document.querySelectorAll('.slider-container');

    // Font size slider
    const sizeContainer = sliders[0];
    const sizeSlider = sizeContainer?.querySelector('input[type="range"]');
    const sizeValue = sizeContainer?.querySelector('.value');

    if (sizeSlider) {
      sizeSlider.min = "20";
      sizeSlider.max = "100";
      const initialSize = 90;
      sizeSlider.value = initialSize.toString();
      this.paddingPercentage = 40 - ((initialSize - 20) * 40 / 80);

      if (sizeValue) {
        sizeValue.textContent = `${initialSize}%`;
      }
    }

    sizeSlider?.addEventListener('input', (e) => {
      const sizePercentage = parseInt(e.target.value);
      this.paddingPercentage = 40 - ((sizePercentage - 20) * 40 / 80);
      this.textFitter.paddingPercentage = this.paddingPercentage;

      if (sizeValue) {
        sizeValue.textContent = `${sizePercentage}%`;
      }

      if (this.container.firstChild) {
        this.textFitter.fitText(this.container.firstChild, this.container);
      }
    });

    // Animation delay slider with debouncing
    const delayContainer = sliders[1];
    const delaySlider = delayContainer?.querySelector('input[type="range"]');
    const delayValue = delayContainer?.querySelector('.value');

    let delayTimeout;
    delaySlider?.addEventListener('input', (e) => {
      const newDelay = parseInt(e.target.value);
      if (delayValue) {
        delayValue.textContent = newDelay + 'ms';
      }

      clearTimeout(delayTimeout);
      delayTimeout = setTimeout(() => {
        this.updateAnimationDelay(newDelay);
      }, 200);
    });
  }

  updateAnimationDelay(newDelay) {
    this.animationDelay = newDelay;
    if (this.isAnimating) {
      this.stop();
      this.start(newDelay);
    }
  }

  setupEventListeners() {
    // Fullscreen button
    const fullscreenButton = document.querySelector('#fullScreen button');
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', () => {
        this.uiControls.toggleFullscreen();
        fullscreenButton.textContent = document.fullscreenElement ? 'Windowed' : 'Fullscreen';
      });
    }

    // Font info toggle
    const fontInfoToggle = document.getElementById('font-info-toggle');
    const fontInfo = document.getElementById('font-info');
    fontInfoToggle?.addEventListener('click', () => {
      if (!fontInfo) return;
      const isVisible = fontInfo.style.display !== 'none';
      fontInfo.style.display = isVisible ? 'none' : 'block';
      if (fontInfoToggle) {
        fontInfoToggle.textContent = isVisible ? 'Show font info' : 'Hide font info';
      }
    });

    // Background toggle
    document.getElementById('background-toggle')?.addEventListener('click', () => {
      this.uiControls.toggleColorScheme();
    });

    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  handleKeyPress(event) {
    switch(event.key) {
      case ' ':
        event.preventDefault();
        if (this.isAnimating) {
          this.stop();
        } else {
          const delaySlider = document.querySelector('.slider-container:nth-child(2) input[type="range"]');
          this.start(parseInt(delaySlider?.value || this.animationDelay));
        }
        break;
      case 'f':
        this.uiControls.toggleFullscreen();
        const fullscreenButton = document.querySelector('#fullScreen button');
        if (fullscreenButton) {
          fullscreenButton.textContent = document.fullscreenElement ? 'Windowed' : 'Fullscreen';
        }
        break;
    }
  }

  async loadWordList() {
    try {
      const response = await fetch('../word_lists/euro_words.txt');
      const text = await response.text();
      this.wordList = text.split('\n').filter(word => word.trim());
      this.processWordList();
    } catch (error) {
      console.error('Error loading word list:', error);
      this.wordList = ['OpenType', 'Features', 'Typography', 'Design'];
      this.processedWordList = this.wordList;
    }
  }

  processWordList() {
    this.processedWordList = this.wordList.map(word => {
      if (word === word.toLowerCase()) {
        const random = Math.random();
        if (random < 0.05) {
          return word.toUpperCase();
        } else if (random < 0.15) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
      }
      return word;
    });
  }

  handleFontLoaded({ font, fontInfo, fontFamily }) {
    FontInfoRenderer.renderFontInfo(
      document.getElementById('font-info-content'),
      fontInfo
    );

    this.container.style.fontFamily = `"${fontFamily}"`;

    // Extract and set up OpenType features
    this.openTypeFeatures.clear();
    this.openTypeFeatures.extractFeatures(fontInfo);
    this.openTypeFeatures.createButtons();

    // Create axis controls if font has variable axes
    if (fontInfo.axes) {
      this.variationAxes.createAxesControls(fontInfo.axes);
    }

    this.start();
  }

  async start(interval = this.animationDelay) {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.animationDelay = interval;

    if (this.wordList.length === 0) {
      await this.loadWordList();
    }

    this.updateWord();
    this.scheduleNextUpdate();
  }

  stop() {
    this.isAnimating = false;
    clearTimeout(this.animationTimer);
    clearTimeout(this.fadeTimer);
    this.animationTimer = null;
    this.fadeTimer = null;
  }

  scheduleNextUpdate() {
    if (!this.isAnimating) return;

    this.animationTimer = setTimeout(() => {
      this.updateWord();
      this.scheduleNextUpdate();
    }, this.animationDelay);
  }

  updateWord() {
    if (this.wordList.length === 0 || !this.isAnimating) return;

    clearTimeout(this.fadeTimer);
    this.container.classList.add('fade-out');

    this.fadeTimer = setTimeout(() => {
      if (!this.isAnimating) return;

      const word = this.getRandomWord();
      const wordElement = document.createElement('div');
      wordElement.textContent = word;
      wordElement.style.whiteSpace = 'nowrap';

      // Apply current OpenType features and variation settings
      const currentFeatures = this.openTypeFeatures.getFeatureString();
      wordElement.style.fontFeatureSettings = currentFeatures;
      wordElement.style.fontVariationSettings = this.currentVariationSettings;

      this.container.innerHTML = '';
      this.container.appendChild(wordElement);

      this.textFitter.fitText(wordElement, this.container);

      this.container.classList.remove('fade-out');
    }, 300);
  }

  getRandomWord() {
    return this.processedWordList[Math.floor(Math.random() * this.processedWordList.length)];
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new WordAnimator();
});

export { WordAnimator };
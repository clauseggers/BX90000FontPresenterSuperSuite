// =============================================================================
// wordmaster/WordMaster.js
// =============================================================================

import { FontLoader } from '../core/FontLoader.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { MetricsOverlay } from '../shared/MetricsOverlay.js';
import { VariationAxes } from '../shared/VariationAxes.js';
import { UIControls } from '../shared/UIControls.js';
import { DragAndDrop } from '../shared/DragAndDrop.js';
import { TextFitter } from './TextFitter.js';
import { OpenTypeFeatures } from './OpenTypeFeatures.js';
import { initAppNav } from '../shared/AppNav.js';

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
        this.currentVariationSettings = settings;
        if (this.container.firstChild) {
          this.container.firstChild.style.fontVariationSettings = settings;
        }
      }
    });

    this.initializeSliders();
  }

  updateFeatures(featureString) {
    if (this.container.firstChild) {
      this.container.firstChild.style.fontFeatureSettings = featureString;
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

    // Animation delay slider
    const delaySlider = sliders[1]?.querySelector('input[type="range"]');
    const delayValue = sliders[1]?.querySelector('.value');

    if (delaySlider) {
      // Set initial delay value
      this.animationDelay = parseInt(delaySlider.value);
    }

    delaySlider?.addEventListener('input', (e) => {
      const newDelay = parseInt(e.target.value);
      if (delayValue) {
        delayValue.textContent = newDelay + 'ms';
      }
      this.animationDelay = newDelay;

      // If animation is running, update the timing
      if (this.isAnimating) {
        clearTimeout(this.animationTimer);
        this.scheduleNextUpdate();
      }
    });
  }

  setupEventListeners() {
    this.uiControls.setupSharedButtons();

    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  handleKeyPress(event) {
    switch(event.key) {
      case ' ':
        event.preventDefault();
        console.log('Space pressed. isAnimating:', this.isAnimating);
        if (this.isAnimating) {
          console.log('Stopping animation');
          this.stop();
        } else {
          console.log('Starting animation');
          // Get the current animation delay value directly from the class
          this.start(this.animationDelay);
        }
        break;
      case 'f':
        this.uiControls.toggleFullscreen();
        break;
    }
  }

  async loadWordList() {
    try {
      const response = await fetch('word_lists/euro_words.txt');
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
        if (random < 0.15) {            // 15% uppercase
          return word.toUpperCase();
        } else if (random < 0.50) {     // 35% capitalized
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      }
      return word;
    });
  }

  handleFontLoaded({ font, fontInfo, fontFamily, buffer }) {
    FontInfoRenderer.renderFontInfo(
      document.getElementById('font-info-content'),
      fontInfo
    );

    this.container.style.fontFamily = `"${fontFamily}"`;

    this.openTypeFeatures.clear();
    this.openTypeFeatures.extractFeatures(fontInfo, font, buffer);
    this.openTypeFeatures.createButtons();

    if (fontInfo.axes) {
      this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances || []);
    }

    this.start();
  }

  async start(interval = this.animationDelay) {
    console.log('Start called with interval:', interval);

    clearTimeout(this.animationTimer);
    clearTimeout(this.fadeTimer);

    this.isAnimating = true;
    this.animationDelay = interval;

    if (this.wordList.length === 0) {
      await this.loadWordList();
    }

    this.container.classList.remove('fade-out');

    // Force an immediate word update
    await this.updateWord();
    this.scheduleNextUpdate();
  }

  stop() {
    console.log('Stop called');
    this.isAnimating = false;
    clearTimeout(this.animationTimer);
    clearTimeout(this.fadeTimer);
    this.animationTimer = null;
    this.fadeTimer = null;
    this.container.classList.remove('fade-out');
  }

  scheduleNextUpdate() {
    clearTimeout(this.animationTimer);

    if (this.isAnimating) {
      this.animationTimer = setTimeout(() => {
        this.updateWord();
        this.scheduleNextUpdate();
      }, this.animationDelay);
    }
  }

  updateWord() {
    return new Promise((resolve) => {
      this.container.classList.add('fade-out');

      setTimeout(() => {
        if (this.isAnimating) {
          const word = this.getRandomWord();
          console.log('Updating to new word:', word);

          const wordElement = document.createElement('div');
          wordElement.textContent = word;
          wordElement.style.whiteSpace = 'nowrap';

          const currentFeatures = this.openTypeFeatures.getFeatureString();
          wordElement.style.fontFeatureSettings = currentFeatures;
          wordElement.style.fontVariationSettings = this.currentVariationSettings;

          this.container.innerHTML = '';
          this.container.appendChild(wordElement);
          this.textFitter.fitText(wordElement, this.container);
        }

        this.container.classList.remove('fade-out');
        resolve();
      }, 300);
    });
  }

  getRandomWord() {
    return this.processedWordList[Math.floor(Math.random() * this.processedWordList.length)];
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new WordAnimator();
  initAppNav();
  app.fontLoader.restoreFromSession();
});

export { WordAnimator };
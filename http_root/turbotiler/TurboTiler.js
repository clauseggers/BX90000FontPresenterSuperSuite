/**
 * TurboTiler.js
 * Main controller for TurboTiler BX90000 Fascination
 * Integrates font loading, grid display, and animation
 */

import { FontLoader } from '../core/FontLoader.js';
import { UIControls } from '../shared/UIControls.js';
import { DragAndDrop } from '../shared/DragAndDrop.js';
import { GlyphGrid } from './GlyphGrid.js';
import { GridAnimator } from './GridAnimator.js';

class TurboTiler {
  constructor() {
    this.initializeComponents();
    this.setupEventListeners();
  }

  initializeComponents() {
    // Get DOM elements
    this.zoomContainer = document.getElementById('zoom-container');
    this.gridContainer = document.getElementById('grid-container');

    // Initialize grid and animator
    this.glyphGrid = new GlyphGrid();
    this.gridAnimator = new GridAnimator(this.zoomContainer, this.glyphGrid);

    // Initialize font loader
    this.fontLoader = new FontLoader({
      onFontLoaded: this.handleFontLoaded.bind(this),
      onError: this.handleError.bind(this)
    });

    // Initialize UI controls
    this.uiControls = new UIControls();

    // Initialize drag and drop
    this.dragAndDrop = new DragAndDrop({
      dropZone: document.body,
      onDrop: this.handleFontDrop.bind(this)
    });

    console.log('TurboTiler initialized');
  }

  setupEventListeners() {
    // Fullscreen button
    const fullscreenButton = document.getElementById('fullscreen-button');
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', () => {
        this.uiControls.toggleFullscreen();
        fullscreenButton.textContent = this.uiControls.isFullscreen ? 'Windowed' : 'Fullscreen';
      });
    }

    // Background/colour swap toggle
    const backgroundToggle = document.getElementById('background-toggle');
    if (backgroundToggle) {
      backgroundToggle.addEventListener('click', () => {
        this.uiControls.toggleColorScheme();
      });
    }

    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyPress.bind(this));

    // Window resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  handleKeyPress(event) {
    switch(event.key.toLowerCase()) {
      case 'f':
        // Toggle fullscreen
        this.uiControls.toggleFullscreen();
        const fullscreenButton = document.getElementById('fullscreen-button');
        if (fullscreenButton) {
          fullscreenButton.textContent = this.uiControls.isFullscreen ? 'Windowed' : 'Fullscreen';
        }
        break;

      case ' ':
        // Spacebar: pause/resume animation
        event.preventDefault();
        if (this.gridAnimator.isPaused) {
          this.gridAnimator.resume();
        } else {
          this.gridAnimator.pause();
        }
        break;
    }
  }

  handleResize() {
    // Immediately pause animation and reset transform to prevent broken coordinates
    if (this.fontLoader.currentFont) {
      this.gridAnimator.pause();
      this.gridAnimator.zoomContainer.style.transition = 'none';
      this.gridAnimator.zoomContainer.style.transform = 'translate(0px, 0px) scale(1.1)';
      // Force reflow
      void this.gridAnimator.zoomContainer.offsetHeight;
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      // Repopulate grid with new dimensions if font is loaded
      if (this.fontLoader.currentFont) {
        // Full reset of animation state
        this.gridAnimator.reset();

        // Repopulate the grid with new dimensions
        this.populateGrid();

        // Wait for layout to complete before starting animation
        // Use double RAF to ensure paint has completed
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.gridAnimator.start();
          });
        });
      }
    }, 250);
  }

  handleFontDrop(arrayBuffer) {
    console.log('Font file dropped, loading...');
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    this.fontLoader.loadFont(arrayBuffer);
  }

  handleFontLoaded({ font, fontInfo, fontFamily }) {
    console.log(`Font loaded: ${font.names.fullName?.en || 'Unknown'}`);
    console.log(`Unique family name: ${fontFamily}`);
    console.log('Font object:', font);
    console.log('Font info:', fontInfo);

    // Store font reference
    this.currentFont = font;
    this.currentFontFamily = fontFamily;

    // Extract glyphs
    const glyphList = this.extractGlyphs(font);
    console.log(`Extracted ${glyphList.length} glyphs`);

    // Extract variable font axes (if any)
    const axes = this.extractAxes(font);
    if (axes.length > 0) {
      console.log(`Found ${axes.length} variable font axes:`, axes.map(a => a.tag));
    }

    // Extract OpenType features (if any)
    const features = this.extractFeatures(font);
    if (features.length > 0) {
      console.log(`Found ${features.length} OpenType features:`, features);
    }

    // Populate the grid
    this.glyphGrid.populate(
      this.gridContainer,
      glyphList,
      axes,
      features,
      fontFamily,
      font
    );

    // Start animation
    this.gridAnimator.start();
  }

  handleError(error) {
    console.error('Font loading error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.constructor.name);
    alert(`Error loading font: ${error.message}\nPlease check the console for details.`);
  }

  /**
   * Extract glyph list from font
   * @param {Object} font - OpenType.js font object
   * @returns {Array} Array of characters
   */
  extractGlyphs(font) {
    const glyphs = [];

    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);

      // Skip .notdef and glyphs without unicode
      if (glyph.name === '.notdef' || glyph.unicode === undefined) {
        continue;
      }

      // Get character from unicode
      const char = String.fromCodePoint(glyph.unicode);
      glyphs.push(char);
    }

    return glyphs;
  }

  /**
   * Extract variable font axes from font
   * @param {Object} font - OpenType.js font object
   * @returns {Array} Array of axis objects
   */
  extractAxes(font) {
    const axes = [];

    if (font.tables.fvar && font.tables.fvar.axes) {
      font.tables.fvar.axes.forEach(axis => {
        axes.push({
          tag: axis.tag,
          name: axis.name?.en || axis.tag,
          minValue: axis.minValue,
          maxValue: axis.maxValue,
          defaultValue: axis.defaultValue
        });
      });
    }

    return axes;
  }

  /**
   * Extract OpenType features from font
   * @param {Object} font - OpenType.js font object
   * @returns {Array} Array of feature tags
   */
  extractFeatures(font) {
    const features = new Set();

    if (font.tables.gsub && font.tables.gsub.features) {
      font.tables.gsub.features.forEach(feature => {
        features.add(feature.tag);
      });
    }

    return Array.from(features);
  }

  /**
   * Repopulate grid (called on resize)
   */
  populateGrid() {
    if (!this.currentFont) return;

    const glyphList = this.extractGlyphs(this.currentFont);
    const axes = this.extractAxes(this.currentFont);
    const features = this.extractFeatures(this.currentFont);

    this.glyphGrid.populate(
      this.gridContainer,
      glyphList,
      axes,
      features,
      this.currentFontFamily,
      this.currentFont
    );
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new TurboTiler();
});

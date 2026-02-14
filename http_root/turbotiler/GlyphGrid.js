/**
 * GlyphGrid.js
 * Manages the grid of glyph cells for TurboTiler BX90000 Fascination
 * Handles cell creation, population, and randomisation of glyphs, axes, and features
 */

export class GlyphGrid {
  constructor() {
    this.cells = [];
    this.glyphList = [];
    this.axes = [];
    this.features = [];
    this.fontFamily = '';
    this.gridCols = 0;
    this.gridRows = 0;
    this.container = null;
  }

  /**
   * Populate the grid with cells
   * @param {HTMLElement} container - The grid container element
   * @param {Array} glyphList - Array of available glyphs (characters)
   * @param {Array} axes - Variable font axes (if any)
   * @param {Array} features - OpenType features (if any)
   * @param {string} fontFamily - The font family name to apply
   * @param {Object} font - OpenType.js font object for metrics
   */
  populate(container, glyphList, axes, features, fontFamily, font) {
    this.glyphList = glyphList;
    this.axes = axes;
    this.features = features;
    this.fontFamily = fontFamily;
    this.font = font;
    this.container = container;

    // Calculate aspect ratio based on font metrics
    this.cellAspectRatio = this.calculateFontAspectRatio(font);

    // Clear existing cells
    container.innerHTML = '';
    this.cells = [];

    // Calculate grid size based on viewport and desired cell count
    const minCellSize = 120;
    // Cell count based on VISIBLE area at scale 0.11
    // The grid is 9x larger, but we want the same cell density when viewed
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.9;
    this.gridCols = Math.floor(viewportWidth / minCellSize);
    this.gridRows = Math.floor(viewportHeight / minCellSize);
    const cellCount = this.gridCols * this.gridRows;

    // Set explicit grid columns and rows in CSS
    container.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${this.gridRows}, 1fr)`;

    // Create grid cells
    for (let i = 0; i < cellCount; i++) {
      const cell = this.createCell();
      container.appendChild(cell);
      this.cells.push(cell);

      // Initialize with random content
      this.updateCell(cell);
    }

    console.log(`Created ${cellCount} grid cells (${this.gridCols} × ${this.gridRows})`);
    console.log(`Font aspect ratio (width:height): ${this.cellAspectRatio.toFixed(3)}`);
  }

  /**
   * Calculate aspect ratio based on font vertical metrics
   * @param {Object} font - OpenType.js font object
   * @returns {number} Width/height aspect ratio
   */
  calculateFontAspectRatio(font) {
    if (!font.tables.os2) {
      return 1; // Fallback to square if no metrics available
    }

    // Get vertical span from ascender to descender
    const ascender = font.tables.os2.sTypoAscender || font.ascender;
    const descender = font.tables.os2.sTypoDescender || font.descender;
    const verticalSpan = ascender - descender; // descender is negative

    // Use 1em (1000 or 2048 units typically) as reference width
    const referenceWidth = font.unitsPerEm || 1000;

    // aspectRatio = width / height
    const aspectRatio = referenceWidth / verticalSpan;

    return aspectRatio;
  }

  /**
   * Create a single grid cell element
   * @returns {HTMLElement} The cell element
   */
  createCell() {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';

    // Apply calculated aspect ratio
    if (this.cellAspectRatio) {
      cell.style.aspectRatio = this.cellAspectRatio;
    }

    const content = document.createElement('div');
    content.className = 'grid-cell-content';
    cell.appendChild(content);

    return cell;
  }

  /**
   * Update a cell with random glyph, axes, and features
   * @param {HTMLElement} cell - The cell to update
   */
  updateCell(cell) {
    const content = cell.querySelector('.grid-cell-content');

    // Random glyph
    const glyph = this.randomizeGlyph();
    content.textContent = glyph;

    // Apply font family
    content.style.fontFamily = `"${this.fontFamily}"`;

    // Random variation axes
    if (this.axes.length > 0) {
      const axisSettings = this.randomizeAxes();
      content.style.fontVariationSettings = axisSettings;
    }

    // Random OpenType features
    if (this.features.length > 0) {
      const featureSettings = this.randomizeFeatures();
      content.style.fontFeatureSettings = featureSettings;
    }
  }

  /**
   * Randomize all cells in the grid
   */
  randomizeAll() {
    this.cells.forEach(cell => this.updateCell(cell));
  }

  /**
   * Get a random glyph from the glyph list
   * @returns {string} A random character
   */
  randomizeGlyph() {
    if (this.glyphList.length === 0) return '?';
    const index = Math.floor(Math.random() * this.glyphList.length);
    return this.glyphList[index];
  }

  /**
   * Generate random axis values
   * @returns {string} CSS font-variation-settings string
   */
  randomizeAxes() {
    if (this.axes.length === 0) return '';

    const settings = this.axes.map(axis => {
      // Generate random value within axis range
      const value = axis.minValue + Math.random() * (axis.maxValue - axis.minValue);
      return `"${axis.tag}" ${value.toFixed(2)}`;
    });

    return settings.join(', ');
  }

  /**
   * Generate random OpenType feature settings
   * @returns {string} CSS font-feature-settings string
   */
  randomizeFeatures() {
    if (this.features.length === 0) return '';

    // Randomly enable/disable each feature (50% chance)
    const settings = this.features.map(feature => {
      const enabled = Math.random() > 0.5 ? 1 : 0;
      return `"${feature}" ${enabled}`;
    });

    return settings.join(', ');
  }

  /**
   * Get a random cell from the grid
   * @returns {Object} Cell element and its grid position
   */
  /**
   * Get a random cell with calculated position
   * @returns {Object|null} Cell info with element, index, and position
   */
  getRandomCell() {
    if (this.cells.length === 0 || !this.container) return null;

    const index = Math.floor(Math.random() * this.cells.length);
    const cell = this.cells[index];

    // Calculate position based on grid layout
    // Grid container is centered and is 90vw x 90vh
    const row = Math.floor(index / this.gridCols);
    const col = index % this.gridCols;

    // Calculate container dimensions (90% of viewport)
    const containerWidth = window.innerWidth * 0.9;
    const containerHeight = window.innerHeight * 0.9;

    // Container is centered in viewport
    const containerLeft = (window.innerWidth - containerWidth) / 2;
    const containerTop = (window.innerHeight - containerHeight) / 2;

    // Calculate cell dimensions (including gap)
    const gap = 2; // matches CSS gap
    const cellWidth = (containerWidth - gap * (this.gridCols - 1)) / this.gridCols;
    const cellHeight = (containerHeight - gap * (this.gridRows - 1)) / this.gridRows;

    // Calculate cell center position in viewport coordinates
    const x = containerLeft + (col * (cellWidth + gap)) + cellWidth / 2;
    const y = containerTop + (row * (cellHeight + gap)) + cellHeight / 2;

    return {
      element: cell,
      index: index,
      x: x,
      y: y
    };
  }

  /**
   * Get the number of cells in the grid
   * @returns {number} Cell count
   */
  getCellCount() {
    return this.cells.length;
  }
}

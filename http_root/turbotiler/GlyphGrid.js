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
    this.zoomOutScale = 1;
    this.containerWidth = 0;
    this.containerHeight = 0;
    this.axisSamplers = [];
  }

  /**
   * Populate the grid with cells
   * @param {HTMLElement} container - The grid container element
   * @param {Array} glyphList - Array of available glyphs (characters)
   * @param {Array} axes - Variable font axes (if any)
   * @param {Array} features - OpenType features (if any)
   * @param {string} fontFamily - The font family name to apply
   * @param {Object} font - OpenType.js font object for metrics
   * @param {number} zoomOutScale - Current zoomed-out container scale
   */
  populate(container, glyphList, axes, features, fontFamily, font, zoomOutScale = 1) {
    this.glyphList = glyphList;
    this.axes = axes;
    this.features = features;
    this.fontFamily = fontFamily;
    this.font = font;
    this.container = container;
    this.zoomOutScale = zoomOutScale;
    this.axisSamplers = this.createAxisSamplers();

    // Calculate aspect ratio based on font metrics
    this.cellAspectRatio = this.calculateFontAspectRatio(font);

    // Clear existing cells
    container.innerHTML = '';
    this.cells = [];

    // Deterministic sizing model:
    // - At scale 1.0, one cell equals one viewport.
    // - At zoomed-out scale, many cells are visible.
    this.viewportWidth = container.parentElement?.clientWidth || window.innerWidth;
    this.viewportHeight = container.parentElement?.clientHeight || window.innerHeight;

    const cellWidthFactor = 0.5;
    const cellHeightFactor = 0.6;
    const minCoverageFactor = 1.06; // slight overscan to avoid edge whitespace
    const overscanCells = 1;
    const minGridCols = 13;
    const minGridRows = 13;

    const requiredCols = Math.ceil(minCoverageFactor / (this.zoomOutScale * cellWidthFactor));
    const requiredRows = Math.ceil(minCoverageFactor / (this.zoomOutScale * cellHeightFactor));

    this.gridCols = Math.max(minGridCols, requiredCols + overscanCells);
    this.gridRows = Math.max(minGridRows, requiredRows + overscanCells);

    // Keep dimensions odd so viewport center lands on a cell center, not a boundary.
    if (this.gridCols % 2 === 0) this.gridCols += 1;
    if (this.gridRows % 2 === 0) this.gridRows += 1;

    const cellWidth = this.viewportWidth * cellWidthFactor;
    const cellHeight = this.viewportHeight * cellHeightFactor;
    this.containerWidth = this.gridCols * cellWidth;
    this.containerHeight = this.gridRows * cellHeight;

    // Keep CSS container dimensions in sync with layout math.
    container.style.width = `${this.containerWidth}px`;
    container.style.height = `${this.containerHeight}px`;
    const cellCount = this.gridCols * this.gridRows;

    // Set explicit grid columns and rows in CSS
    container.style.gridTemplateColumns = `repeat(${this.gridCols}, ${cellWidth}px)`;
    container.style.gridTemplateRows = `repeat(${this.gridRows}, ${cellHeight}px)`;

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

    const nonLinearAxisTags = this.axisSamplers
      .filter(sampler => sampler.hasNonLinearAvar)
      .map(sampler => sampler.tag);

    if (nonLinearAxisTags.length > 0) {
      console.log('Detected non-linear avar axes:', nonLinearAxisTags);
    }
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
      const value = this.sampleAxisValue(axis);
      return `"${axis.tag}" ${value.toFixed(2)}`;
    });

    return settings.join(', ');
  }

  /**
   * Build sampling metadata for each variation axis.
   * Uses avar segment maps (if present) to detect and correct non-linear axes.
   * @returns {Array<Object>} Sampler metadata aligned with this.axes order
   */
  createAxisSamplers() {
    if (!this.font?.tables?.fvar?.axes || this.axes.length === 0) {
      return [];
    }

    const axisOrder = this.font.tables.fvar.axes;
    const avarMaps = this.font.tables.avar?.axisSegmentMaps || [];
    const epsilon = 1e-6;

    return this.axes.map(axis => {
      const axisIndex = axisOrder.findIndex(fontAxis => fontAxis.tag === axis.tag);
      const segmentMap = axisIndex >= 0 ? avarMaps[axisIndex] : null;
      const pairs = (segmentMap?.axisValueMaps || [])
        .map(pair => ({
          fromCoordinate: pair.fromCoordinate,
          toCoordinate: pair.toCoordinate
        }))
        .sort((left, right) => left.fromCoordinate - right.fromCoordinate);

      const hasNonLinearAvar = pairs.some(pair => Math.abs(pair.toCoordinate - pair.fromCoordinate) > epsilon);

      return {
        tag: axis.tag,
        hasNonLinearAvar,
        avarPairs: pairs
      };
    });
  }

  /**
   * Sample a value for a variation axis.
   * For non-linear avar axes, sampling is uniform in warped normalized space,
   * then inverted back to user coordinates to avoid visual oversampling.
   * @param {Object} axis - Axis descriptor
   * @returns {number} Axis value in user coordinates
   */
  sampleAxisValue(axis) {
    const sampler = this.axisSamplers.find(item => item.tag === axis.tag);

    if (!sampler?.hasNonLinearAvar || sampler.avarPairs.length < 2) {
      return axis.minValue + Math.random() * (axis.maxValue - axis.minValue);
    }

    const warpedNormalizedTarget = -1 + (Math.random() * 2);
    const rawNormalized = this.invertAvar(sampler.avarPairs, warpedNormalizedTarget);
    return this.normalizedToAxisValue(rawNormalized, axis);
  }

  /**
   * Invert an avar segment map.
   * @param {Array<Object>} pairs - Sorted {fromCoordinate,toCoordinate} pairs
   * @param {number} targetToCoordinate - Target warped normalized coordinate
   * @returns {number} Raw normalized coordinate (pre-avar)
   */
  invertAvar(pairs, targetToCoordinate) {
    if (!pairs || pairs.length < 2) {
      return Math.max(-1, Math.min(1, targetToCoordinate));
    }

    const clampedTarget = Math.max(-1, Math.min(1, targetToCoordinate));

    // Identify interval by output (toCoordinate) and linearly invert it.
    for (let i = 1; i < pairs.length; i++) {
      const prev = pairs[i - 1];
      const current = pairs[i];
      const minTo = Math.min(prev.toCoordinate, current.toCoordinate);
      const maxTo = Math.max(prev.toCoordinate, current.toCoordinate);

      if (clampedTarget < minTo || clampedTarget > maxTo) {
        continue;
      }

      const outputDelta = current.toCoordinate - prev.toCoordinate;
      if (Math.abs(outputDelta) < 1e-9) {
        return prev.fromCoordinate;
      }

      const ratio = (clampedTarget - prev.toCoordinate) / outputDelta;
      const fromValue = prev.fromCoordinate + ratio * (current.fromCoordinate - prev.fromCoordinate);
      return Math.max(-1, Math.min(1, fromValue));
    }

    // Fallback for edge cases: clamp to nearest endpoint by output distance.
    const first = pairs[0];
    const last = pairs[pairs.length - 1];
    const nearest = Math.abs(clampedTarget - first.toCoordinate) <= Math.abs(clampedTarget - last.toCoordinate)
      ? first
      : last;
    return Math.max(-1, Math.min(1, nearest.fromCoordinate));
  }

  /**
   * Convert normalized axis coordinate (-1..1 around default) back to user value.
   * @param {number} normalizedValue - Normalized coordinate
   * @param {Object} axis - Axis descriptor
   * @returns {number} Axis coordinate in user space
   */
  normalizedToAxisValue(normalizedValue, axis) {
    const clamped = Math.max(-1, Math.min(1, normalizedValue));

    if (clamped < 0) {
      return axis.defaultValue + clamped * (axis.defaultValue - axis.minValue);
    }

    return axis.defaultValue + clamped * (axis.maxValue - axis.defaultValue);
  }

  /**
   * Generate random OpenType feature settings
   * @returns {string} CSS font-feature-settings string
   */
  randomizeFeatures() {
    if (this.features.length === 0) return '';

    const randomizablePattern = /^(ss\d\d|cv\d\d|case|ordn|smcp|sinf|sups|subs|pnum|tnum|onum|lnum|zero)$/;

    // Only randomize discretionary features. Required shaping features must remain untouched.
    const randomizableFeatures = this.features.filter(feature => randomizablePattern.test(feature));
    if (randomizableFeatures.length === 0) {
      return 'normal';
    }

    const settings = randomizableFeatures.map(feature => {
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
  getCellInfoByIndex(index) {
    if (this.cells.length === 0 || !this.container) return null;

    const cell = this.cells[index];

    // Calculate position based on grid layout
    // Grid container is centered and sized to the unscaled layout dimensions
    const row = Math.floor(index / this.gridCols);
    const col = index % this.gridCols;

    // Calculate container dimensions (must match populate())
    const viewportWidth = this.viewportWidth || this.container?.parentElement?.clientWidth || window.innerWidth;
    const viewportHeight = this.viewportHeight || this.container?.parentElement?.clientHeight || window.innerHeight;
    const containerWidth = this.containerWidth || (viewportWidth / this.zoomOutScale);
    const containerHeight = this.containerHeight || (viewportHeight / this.zoomOutScale);

    // Container is centered in viewport
    const containerLeft = (viewportWidth - containerWidth) / 2;
    const containerTop = (viewportHeight - containerHeight) / 2;

    // Calculate cell dimensions (including gap)
    const computedStyles = window.getComputedStyle(this.container);
    const gap = parseFloat(computedStyles.columnGap || computedStyles.gap || '0') || 0;
    const cellWidth = (containerWidth - gap * (this.gridCols - 1)) / this.gridCols;
    const cellHeight = (containerHeight - gap * (this.gridRows - 1)) / this.gridRows;

    // Calculate cell center position in viewport coordinates
    const x = containerLeft + (col * (cellWidth + gap)) + cellWidth / 2;
    const y = containerTop + (row * (cellHeight + gap)) + cellHeight / 2;

    return {
      element: cell,
      index: index,
      x: x,
      y: y,
      cellWidth: cellWidth,
      cellHeight: cellHeight
    };
  }

  /**
   * Get a random cell with calculated position
   * @returns {Object|null} Cell info with element, index, and position
   */
  getRandomCell() {
    if (this.cells.length === 0 || !this.container) return null;

    const index = Math.floor(Math.random() * this.cells.length);
    return this.getCellInfoByIndex(index);
  }

  /**
   * Get the center cell with calculated position
   * @returns {Object|null} Cell info with element, index, and position
   */
  getCenterCell() {
    if (this.cells.length === 0 || !this.container) return null;

    const centerRow = Math.floor(this.gridRows / 2);
    const centerCol = Math.floor(this.gridCols / 2);
    const index = centerRow * this.gridCols + centerCol;
    return this.getCellInfoByIndex(index);
  }

  /**
   * Get the number of cells in the grid
   * @returns {number} Cell count
   */
  getCellCount() {
    return this.cells.length;
  }
}

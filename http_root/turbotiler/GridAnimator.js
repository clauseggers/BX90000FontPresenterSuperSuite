/**
 * GridAnimator.js
 * Animation controller for TurboTiler BX90000 Fascination
 * Manages zoom/pan animations and glyph randomisation timing
 */

export class GridAnimator {
  constructor(zoomContainer, glyphGrid) {
    this.zoomContainer = zoomContainer;
    this.glyphGrid = glyphGrid;

    // Animation states
    this.states = {
      ZOOM_IN: 'zoom_in',
      DWELL: 'dwell',
      ZOOM_OUT: 'zoom_out'
    };

      this.currentState = this.states.DWELL;
    this.isPaused = false;

    // Timing (in milliseconds)
    this.timing = {
      zoomIn: 6000,    // 6 seconds
      dwell: 1000,     // 1 seconds
      zoomOut: 6000,   // 6 seconds
      dwellOut: 1000   // Reserved for loop mode
    };

    this.easing = {
      zoomIn: 'cubic-bezier(0.5, 0, 0.6, 1)',
      zoomOut: 'cubic-bezier(0.22, 1, 0.36, 1)'
    };

    // Zoom parameters
    // Inverted approach: zoomed-in state uses native scale (1.0) for crisp rendering,
    // zoomed-out state scales down to show the full grid.
      this.zoomScale = {
        min: 0.12,     // Zoomed out overview
        max: 1.0       // Zoomed in (native scale for sharp glyphs)
    };

    // Continuous mode: keep cycling between zoomed-in and zoomed-out states.
    this.loopEnabled = true;

    this.currentScale = this.zoomScale.min;
    this.currentTarget = { x: 0, y: 0 };
    this.nextTarget = null;

    // Animation frame tracking
    this.animationFrameId = null;
    this.stateStartTime = 0;

    // Central glyph change scheduler (5 Hz batched updates)
    this.glyphChangeTimerId = null;
    this.glyphChangeBatchIntervalMs = 50;
    this.maxCellUpdatesPerTick = 12;
    this.glyphChangeBatches = [];
    this.glyphChangeTickIndex = 0;
    this.glyphChangeTotalTicks = 0;

    // Glyph change settings by phase (random range per cell, inclusive)
    this.glyphChangeSettings = {
      zoom: {
        minPerCell: 4,
        maxPerCell: 10,
        middleBias: 0.05
      },
      dwellOut: {
        enabled: true,
        minPerCell: 0,
        maxPerCell: 1,
        middleBias: 0
      }
    };

    // State transition timers
    this.stateTransitionTimers = [];
  }

  getViewportDimensions() {
    const viewportElement = this.zoomContainer?.parentElement;
    return {
      width: viewportElement?.clientWidth || window.innerWidth,
      height: viewportElement?.clientHeight || window.innerHeight
    };
  }

  /**
   * Start the animation loop
   */
  start() {
    // Always start from a clean animation state (important when loading a new font).
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();

    this.isPaused = false;
    this.stateStartTime = performance.now();
    // Start from a one-cell zoomed-in view, then animate out.
    this.nextTarget = this.glyphGrid.getCenterCell() || this.pickRandomTarget();
    this.currentTarget = this.nextTarget;
    const initialScale = this.calculateCellFitScale(this.currentTarget);
    this.currentScale = initialScale;

    this.zoomContainer.style.transition = 'none';
    this.applyZoomTransform(this.currentTarget.x, this.currentTarget.y, initialScale);
    void this.zoomContainer.offsetHeight;
    this.zoomContainer.style.transition = `transform ${this.timing.zoomOut}ms ${this.easing.zoomOut}`;

    // Briefly hold the one-cell view, then explicitly zoom out.
    this.currentState = this.states.ZOOM_OUT;
    const initialTimer = setTimeout(() => {
      if (!this.isPaused) {
        this.startZoomOut();
      }
    }, 500);
    this.stateTransitionTimers.push(initialTimer);
  }

  /**
   * Reset animator to initial state
   */
  reset() {
    // Clear any pending timers
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();

    // Reset state
      this.currentState = this.states.DWELL;
    this.isPaused = false;
    this.currentScale = this.zoomScale.min;
    this.currentTarget = { x: 0, y: 0 };
    this.nextTarget = null;

    // Reset zoom transform immediately without transition
    this.zoomContainer.style.transition = 'none';
    this.zoomContainer.style.transform =
      `perspective(1px) translate3d(0px, 0px, 0) scale3d(${this.zoomScale.min}, ${this.zoomScale.min}, 1)`;

    // Force multiple reflows to ensure the transform is fully applied
    void this.zoomContainer.offsetHeight;
    void this.zoomContainer.offsetWidth;

    // Re-enable transitions after a microtask
    setTimeout(() => {
      this.zoomContainer.style.transition = '';
    }, 0);
  }

  /**
   * Pause the animation
   */
  pause() {
    this.isPaused = true;
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resume the animation
   */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.stateStartTime = performance.now();
    this.scheduleNextCycle();
  }

  /**
   * Schedule the next animation cycle
   */
  scheduleNextCycle() {
    if (this.isPaused) return;

    if (!this.loopEnabled && this.currentState === this.states.ZOOM_OUT) {
      return;
    }

    // Move to next state
    switch (this.currentState) {
      case this.states.ZOOM_OUT:
        this.currentState = this.states.ZOOM_IN;
        this.startZoomIn();
        break;
      case this.states.ZOOM_IN:
        this.currentState = this.states.DWELL;
        this.startDwell();
        break;
      case this.states.DWELL:
        this.currentState = this.states.ZOOM_OUT;
        this.startZoomOut();
        break;
    }
  }

  /**
   * Start zoom in phase
   */
  startZoomIn() {
    // Pick random target cell for zoomed-in state.
    this.nextTarget = this.pickRandomTarget();

    // Always set transition explicitly for this phase.
    this.zoomContainer.style.transition = `transform ${this.timing.zoomIn}ms ${this.easing.zoomIn}`;

    // Fit zoom-in to a single glyph cell.
    const targetScale = this.calculateCellFitScale(this.nextTarget);

    // Apply zoom transform
    this.applyZoomTransform(this.nextTarget.x, this.nextTarget.y, targetScale);

    // Schedule individual cell changes during first 3.5 seconds
    // Last 500ms before dwell is kept static
    this.scheduleIndividualCellChanges(this.timing.zoomIn - 500);

    // Schedule next state
    const timer = setTimeout(() => {
      if (!this.isPaused) {
        this.currentScale = targetScale;
        this.currentTarget = this.nextTarget;
        this.scheduleNextCycle();
      }
    }, this.timing.zoomIn);
    this.stateTransitionTimers.push(timer);
  }

  /**
    * Calculate zoom scale that isolates a single cell in viewport
   * @param {Object} target - Target info from getRandomCell()
   * @returns {number} Scale factor
   */
  calculateCellFitScale(target) {
    if (!target || !target.cellWidth || !target.cellHeight) {
      return this.zoomScale.max;
    }

    const { width, height } = this.getViewportDimensions();
    const fitX = width / target.cellWidth;

    // Width-fit to isolate one column/cell and keep target centered.
    return fitX * 0.80;
  }

  /**
   * Start dwell phase (pause at zoomed-in state)
   */
  startDwell() {
    // No glyph changes during dwell - just hold the current view

    // Schedule next state
    const timer = setTimeout(() => {
      if (!this.isPaused) {
        this.scheduleNextCycle();
      }
    }, this.timing.dwell);
    this.stateTransitionTimers.push(timer);
  }

  /**
   * Start zoom out phase
   */
  startZoomOut() {
    this.currentState = this.states.ZOOM_OUT;

    // Always set transition explicitly for this phase.
    this.zoomContainer.style.transition = `transform ${this.timing.zoomOut}ms ${this.easing.zoomOut}`;

    // Zoom back to centered overview scale
    this.applyZoomTransform(0, 0, this.zoomScale.min);

    // Start glyph changes immediately during zoom out
    this.scheduleIndividualCellChanges(this.timing.zoomOut - 500);

    // Schedule next state
    const stateTimer = setTimeout(() => {
      if (!this.isPaused) {
        this.currentScale = this.zoomScale.min;
        this.currentTarget = { x: 0, y: 0 };

        if (this.loopEnabled) {
          if (this.glyphChangeSettings.dwellOut.enabled) {
            this.scheduleIndividualCellChanges(this.timing.dwellOut, this.glyphChangeSettings.dwellOut);
          }

          const dwellOutTimer = setTimeout(() => {
            if (!this.isPaused) {
              this.scheduleNextCycle();
            }
          }, this.timing.dwellOut);
          this.stateTransitionTimers.push(dwellOutTimer);
        }
      }
    }, this.timing.zoomOut);
    this.stateTransitionTimers.push(stateTimer);
  }

  /**
   * Pick a random cell as zoom target
   * @returns {Object} Target coordinates relative to viewport center
   */
  pickRandomTarget() {
    const cellInfo = this.glyphGrid.getRandomCell();
    if (!cellInfo) return { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };

    // Calculate offset from viewport center
    // Cell positions are in unscaled grid space, which is what we need
    const { width, height } = this.getViewportDimensions();
    const centerX = width / 2;
    const centerY = height / 2;

    const offsetX = cellInfo.x - centerX;
    const offsetY = cellInfo.y - centerY;

    return {
      x: offsetX,
      y: offsetY,
      element: cellInfo.element,
      cellWidth: cellInfo.cellWidth,
      cellHeight: cellInfo.cellHeight
    };
  }

  /**
   * Apply zoom and pan transform to container
   * @param {number} scale - The zoom scale
   * @param {number} targetX - Target X offset from center
   * @param {number} targetY - Target Y offset from center
   */
  applyZoomTransform(targetX, targetY, scale) {
    // targetX/targetY are offsets from viewport center.
    // With center-origin scaling, translate must counter the scaled offset.
    const baseTranslateX = -(targetX * scale);
    const baseTranslateY = -(targetY * scale);

    this.zoomContainer.style.transform =
      `perspective(1px) translate3d(${baseTranslateX}px, ${baseTranslateY}px, 0) scale3d(${scale}, ${scale}, 1)`;
  }

  /**
   * Generate a random time weighted toward the middle using a bell curve
   * @param {number} duration - Total duration in ms
   * @param {number} middleBias - Bias toward middle (0 to 1)
   * @returns {number} Random time between 0 and duration, weighted to center
   */
  randomTimeWeightedToMiddle(duration, middleBias = 0.1) {
    const bellCurveRandom = (Math.random() + Math.random() + Math.random()) / 3;
    const uniformRandom = Math.random();

    // Blend bell-curve with uniform random to control middle clustering.
    // 0 = fully uniform, 1 = strongly middle-weighted.
    const bias = Math.min(1, Math.max(0, middleBias));
    const weightedRandom = (bellCurveRandom * bias) + (uniformRandom * (1 - bias));

    return weightedRandom * duration;
  }

  /**
   * Schedule individual cell changes at random times, weighted toward middle
   * @param {number} duration - Phase duration in ms
   * @param {Object} settings - Per-phase glyph change settings
   */
  scheduleIndividualCellChanges(duration, settings = this.glyphChangeSettings.zoom) {
    this.clearGlyphChangeTimers();

    if (duration <= 0) return;

    const cellCount = this.glyphGrid.getCellCount();
    if (cellCount === 0) return;

    const minChanges = Math.max(0, Math.floor(settings.minPerCell ?? 0));
    const maxChanges = Math.max(minChanges, Math.floor(settings.maxPerCell ?? minChanges));
    const middleBias = settings.middleBias ?? 0.1;
    const totalTicks = Math.max(1, Math.ceil(duration / this.glyphChangeBatchIntervalMs));
    const batches = Array.from({ length: totalTicks }, () => []);

    // Each cell gets random number of changes (inclusive range)
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex++) {
      const changesForThisCell = Math.floor(Math.random() * (maxChanges - minChanges + 1)) + minChanges;

      // Generate random times for each change, weighted toward middle
      for (let changeNum = 0; changeNum < changesForThisCell; changeNum++) {
        const delay = this.randomTimeWeightedToMiddle(duration, middleBias);
        const tickIndex = Math.min(totalTicks - 1, Math.floor(delay / this.glyphChangeBatchIntervalMs));
        batches[tickIndex].push(cellIndex);
      }
    }

    this.glyphChangeBatches = batches;
    this.glyphChangeTickIndex = 0;
    this.glyphChangeTotalTicks = totalTicks;

    // Run the first batch immediately, then continue at 5 Hz.
    this.processGlyphChangeBatchTick();
    if (this.glyphChangeTickIndex < this.glyphChangeTotalTicks) {
      this.glyphChangeTimerId = setInterval(() => {
        this.processGlyphChangeBatchTick();
      }, this.glyphChangeBatchIntervalMs);
    }
  }

  /**
   * Process one scheduled glyph-change batch tick
   */
  processGlyphChangeBatchTick() {
    if (this.glyphChangeTickIndex >= this.glyphChangeTotalTicks) {
      this.clearGlyphChangeTimers();
      return;
    }

    const batch = this.glyphChangeBatches[this.glyphChangeTickIndex] || [];

    if (!this.isPaused && batch.length > 0) {
      // De-duplicate per tick so each cell updates at most once every 200ms.
      const uniqueCellIndices = Array.from(new Set(batch));
      const tickUpdateCount = Math.min(this.maxCellUpdatesPerTick, uniqueCellIndices.length);

      for (let i = 0; i < tickUpdateCount; i++) {
        const cellIndex = uniqueCellIndices[i];
        const cell = this.glyphGrid.cells[cellIndex];
        if (cell) {
          this.glyphGrid.updateCell(cell);
        }
      }

      // Carry overflow to the next tick to smooth per-frame layout work.
      if (uniqueCellIndices.length > tickUpdateCount) {
        const overflow = uniqueCellIndices.slice(tickUpdateCount);
        const nextTickIndex = this.glyphChangeTickIndex + 1;
        if (nextTickIndex < this.glyphChangeTotalTicks) {
          this.glyphChangeBatches[nextTickIndex].push(...overflow);
        }
      }
    }

    this.glyphChangeTickIndex += 1;

    if (this.glyphChangeTickIndex >= this.glyphChangeTotalTicks) {
      this.clearGlyphChangeTimers();
    }
  }

  /**
   * Clear all pending glyph change timers
   */
  clearGlyphChangeTimers() {
    if (this.glyphChangeTimerId !== null) {
      clearInterval(this.glyphChangeTimerId);
      this.glyphChangeTimerId = null;
    }

    this.glyphChangeBatches = [];
    this.glyphChangeTickIndex = 0;
    this.glyphChangeTotalTicks = 0;
  }

  /**
   * Clear all pending state transition timers
   */
  clearStateTransitionTimers() {
    this.stateTransitionTimers.forEach(timer => clearTimeout(timer));
    this.stateTransitionTimers = [];
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.pause();
    this.clearGlyphChangeTimers();
  }
}

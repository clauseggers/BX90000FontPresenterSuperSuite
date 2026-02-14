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

    this.currentState = this.states.ZOOM_OUT;
    this.isPaused = false;

    // Timing (in milliseconds)
    this.timing = {
      zoomIn: 4000,    // 4 seconds
      dwell: 3000,     // 3 seconds
      zoomOut: 4000    // 4 seconds
    };

    // Zoom parameters
    // Using standard scale-up approach with optimized font size
    // 10vmin × 1.1 = 11vmin in grid | 10vmin × 10 = 100vmin zoomed
    this.zoomScale = {
      min: 1.1,      // Zoomed out (grid fills viewport with margin)
      max: 10.0      // Zoomed in (single glyph)
    };

    this.currentScale = 1.1;
    this.currentTarget = { x: 0, y: 0 };
    this.nextTarget = null;

    // Animation frame tracking
    this.animationFrameId = null;
    this.stateStartTime = 0;

    // Glyph change timers
    this.glyphChangeTimers = [];

    // State transition timers
    this.stateTransitionTimers = [];
  }

  /**
   * Start the animation loop
   */
  start() {
    this.isPaused = false;
    this.stateStartTime = performance.now();
    this.scheduleNextCycle();
  }

  /**
   * Reset animator to initial state
   */
  reset() {
    // Clear any pending timers
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();

    // Reset state
    this.currentState = this.states.ZOOM_OUT;
    this.isPaused = false;
    this.currentScale = 1.1;
    this.currentTarget = { x: 0, y: 0 };
    this.nextTarget = null;

    // Reset zoom transform immediately without transition
    this.zoomContainer.style.transition = 'none';
    this.zoomContainer.style.transform = 'translate(0px, 0px) scale(1.1)';

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
    // Pick random target cell
    this.nextTarget = this.pickRandomTarget();

    // Apply zoom transform
    this.applyZoomTransform(this.zoomScale.max, this.nextTarget.x, this.nextTarget.y);

    // Schedule individual cell changes during first 3.5 seconds
    // Last 500ms before dwell is kept static
    this.scheduleIndividualCellChanges(this.timing.zoomIn - 500);

    // Schedule next state
    const timer = setTimeout(() => {
      if (!this.isPaused) {
        this.currentScale = this.zoomScale.max;
        this.currentTarget = this.nextTarget;
        this.scheduleNextCycle();
      }
    }, this.timing.zoomIn);
    this.stateTransitionTimers.push(timer);
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
    // Zoom back to original scale
    this.applyZoomTransform(this.zoomScale.min, 0, 0);

    // Start glyph changes immediately during zoom out
    this.scheduleIndividualCellChanges(this.timing.zoomOut - 500);

    // Schedule next state
    const stateTimer = setTimeout(() => {
      if (!this.isPaused) {
        this.currentScale = this.zoomScale.min;
        this.currentTarget = { x: 0, y: 0 };
        this.scheduleNextCycle();
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
    if (!cellInfo) return { x: 0, y: 0 };

    // Calculate offset from viewport center
    // Cell positions are in unscaled grid space, which is what we need
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const offsetX = cellInfo.x - centerX;
    const offsetY = cellInfo.y - centerY;

    // Add bounds checking to prevent selecting cells too far from center
    // At max zoom (1.0 / 0.11 = ~9x), we don't want to pan more than half the grid size
    const maxOffset = Math.min(window.innerWidth, window.innerHeight) * 0.35;
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

    // If cell is too far, try to find a closer one (max 5 attempts)
    if (distance > maxOffset) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const newCellInfo = this.glyphGrid.getRandomCell();
        if (!newCellInfo) break;

        const newOffsetX = newCellInfo.x - centerX;
        const newOffsetY = newCellInfo.y - centerY;
        const newDistance = Math.sqrt(newOffsetX * newOffsetX + newOffsetY * newOffsetY);

        if (newDistance <= maxOffset) {
          return {
            x: newOffsetX,
            y: newOffsetY
          };
        }
      }
      // If we couldn't find a close cell, clamp the offset
      const scale = maxOffset / distance;
      return {
        x: offsetX * scale,
        y: offsetY * scale
      };
    }

    return {
      x: offsetX,
      y: offsetY
    };
  }

  /**
   * Apply zoom and pan transform to container
   * @param {number} scale - The zoom scale
   * @param {number} targetX - Target X offset from center
   * @param {number} targetY - Target Y offset from center
   */
  applyZoomTransform(scale, targetX, targetY) {
    // Calculate translation needed to keep target cell centered
    // With transform-origin at center, we need to translate by -offset * scale
    // to counteract the scaling displacement
    const translateX = -targetX * scale;
    const translateY = -targetY * scale;

    this.zoomContainer.style.transform =
      `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  /**
   * Generate a random time weighted toward the middle using a bell curve
   * @param {number} duration - Total duration in ms
   * @returns {number} Random time between 0 and duration, weighted to center
   */
  randomTimeWeightedToMiddle(duration) {
    // Use sum of 3 random numbers to approximate normal distribution (central limit theorem)
    // This creates a bell curve centered at 0.5
    const r1 = Math.random();
    const r2 = Math.random();
    const r3 = Math.random();
    const weightedRandom = (r1 + r2 + r3) / 3;

    return weightedRandom * duration;
  }

  /**
   * Schedule individual cell changes at random times, weighted toward middle
   * @param {number} duration - Phase duration in ms
   */
  scheduleIndividualCellChanges(duration) {
    this.clearGlyphChangeTimers();

    const cellCount = this.glyphGrid.getCellCount();
    if (cellCount === 0) return;

    // Each cell gets random number of changes (5-15)
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex++) {
      const changesForThisCell = Math.floor(Math.random() * 11) + 5;

      // Generate random times for each change, weighted toward middle
      for (let changeNum = 0; changeNum < changesForThisCell; changeNum++) {
        const delay = this.randomTimeWeightedToMiddle(duration);

        const timer = setTimeout(() => {
          if (!this.isPaused) {
            const cell = this.glyphGrid.cells[cellIndex];
            if (cell) {
              this.glyphGrid.updateCell(cell);
            }
          }
        }, delay);

        this.glyphChangeTimers.push(timer);
      }
    }
  }

  /**
   * Clear all pending glyph change timers
   */
  clearGlyphChangeTimers() {
    this.glyphChangeTimers.forEach(timer => clearTimeout(timer));
    this.glyphChangeTimers = [];
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

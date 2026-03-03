/**
 * GridAnimator.ts
 * Animation controller for TurboTiler BX90000 Fascination
 */

import type { GlyphGrid, CellInfo } from './GlyphGrid.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type AnimationState = 'zoom_in' | 'dwell' | 'zoom_out';

interface ZoomScale {
  min: number;
  max: number;
}

interface Timing {
  zoomIn:   number;
  dwell:    number;
  zoomOut:  number;
  dwellOut: number;
}

interface Easing {
  zoomIn:  string;
  zoomOut: string;
}

interface GlyphChangeSettings {
  enabled?:    boolean;
  minPerCell:  number;
  maxPerCell:  number;
  middleBias:  number;
}

interface Target {
  x:          number;
  y:          number;
  element?:   HTMLElement;
  cellWidth:  number;
  cellHeight: number;
}

// ---------------------------------------------------------------------------

export class GridAnimator {
  private readonly zoomContainer: HTMLElement;
  private readonly glyphGrid:     GlyphGrid;

  private readonly states = {
    ZOOM_IN:  'zoom_in'   as const,
    DWELL:    'dwell'     as const,
    ZOOM_OUT: 'zoom_out'  as const,
  } satisfies Record<string, AnimationState>;

  private currentState: AnimationState = 'dwell';

  isPaused = false;

  private readonly timing: Timing = {
    zoomIn:   6000,
    dwell:    1000,
    zoomOut:  6000,
    dwellOut: 1000,
  };

  private readonly easing: Easing = {
    zoomIn:  'cubic-bezier(0.5, 0, 0.6, 1)',
    zoomOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  };

  zoomScale: ZoomScale = { min: 0.12, max: 1.0 };

  loopEnabled   = true;
  private currentScale  = 0.12;
  private currentTarget: Target = { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };
  private nextTarget:    Target | null = null;

  private animationFrameId: number | null = null;
  private stateStartTime    = 0;

  private glyphChangeTimerId:        ReturnType<typeof setInterval> | null = null;
  private readonly glyphChangeBatchIntervalMs = 50;
  private readonly maxCellUpdatesPerTick      = 12;
  private glyphChangeBatches:  number[][]     = [];
  private glyphChangeTickIndex                = 0;
  private glyphChangeTotalTicks               = 0;

  private readonly glyphChangeSettings: { zoom: GlyphChangeSettings; dwellOut: GlyphChangeSettings } = {
    zoom: {
      minPerCell: 4,
      maxPerCell: 10,
      middleBias: 0.05,
    },
    dwellOut: {
      enabled:    true,
      minPerCell: 0,
      maxPerCell: 1,
      middleBias: 0,
    },
  };

  private stateTransitionTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(zoomContainer: HTMLElement, glyphGrid: GlyphGrid) {
    this.zoomContainer = zoomContainer;
    this.glyphGrid     = glyphGrid;
    this.currentScale  = this.zoomScale.min;
  }

  // ---------------------------------------------------------------------------
  // Viewport helpers
  // ---------------------------------------------------------------------------

  private getViewportDimensions(): { width: number; height: number } {
    const el = this.zoomContainer.parentElement;
    return {
      width:  el?.clientWidth  ?? window.innerWidth,
      height: el?.clientHeight ?? window.innerHeight,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();

    this.isPaused       = false;
    this.stateStartTime = performance.now();

    const centerCell   = this.glyphGrid.getCenterCell() ?? this.pickRandomTarget();
    this.nextTarget    = centerCell;
    this.currentTarget = centerCell;
    const initialScale = this.calculateCellFitScale(this.currentTarget);
    this.currentScale  = initialScale;

    this.zoomContainer.style.transition = 'none';
    this.applyZoomTransform(this.currentTarget.x, this.currentTarget.y, initialScale);
    void this.zoomContainer.offsetHeight;
    this.zoomContainer.style.transition = `transform ${this.timing.zoomOut}ms ${this.easing.zoomOut}`;

    this.currentState = this.states.ZOOM_OUT;
    const initialTimer = setTimeout(() => {
      if (!this.isPaused) this.startZoomOut();
    }, 500);
    this.stateTransitionTimers.push(initialTimer);
  }

  reset(): void {
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();

    this.currentState  = this.states.DWELL;
    this.isPaused      = false;
    this.currentScale  = this.zoomScale.min;
    this.currentTarget = { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };
    this.nextTarget    = null;

    this.zoomContainer.style.transition = 'none';
    this.zoomContainer.style.transform  =
      `perspective(1px) translate3d(0px, 0px, 0) scale3d(${this.zoomScale.min}, ${this.zoomScale.min}, 1)`;

    void this.zoomContainer.offsetHeight;
    void this.zoomContainer.offsetWidth;
    setTimeout(() => { this.zoomContainer.style.transition = ''; }, 0);
  }

  pause(): void {
    this.isPaused = true;
    this.clearGlyphChangeTimers();
    this.clearStateTransitionTimers();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    if (!this.isPaused) return;
    this.isPaused       = false;
    this.stateStartTime = performance.now();
    this.scheduleNextCycle();
  }

  destroy(): void {
    this.pause();
    this.clearGlyphChangeTimers();
  }

  // ---------------------------------------------------------------------------
  // State machine
  // ---------------------------------------------------------------------------

  private scheduleNextCycle(): void {
    if (this.isPaused) return;
    if (!this.loopEnabled && this.currentState === this.states.ZOOM_OUT) return;

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

  private startZoomIn(): void {
    this.nextTarget = this.pickRandomTarget();

    this.zoomContainer.style.transition = `transform ${this.timing.zoomIn}ms ${this.easing.zoomIn}`;
    const targetScale = this.calculateCellFitScale(this.nextTarget);
    this.applyZoomTransform(this.nextTarget.x, this.nextTarget.y, targetScale);

    this.scheduleIndividualCellChanges(this.timing.zoomIn - 500);

    const timer = setTimeout(() => {
      if (!this.isPaused) {
        this.currentScale  = targetScale;
        this.currentTarget = this.nextTarget!;
        this.scheduleNextCycle();
      }
    }, this.timing.zoomIn);
    this.stateTransitionTimers.push(timer);
  }

  private calculateCellFitScale(target: Target): number {
    if (!target.cellWidth || !target.cellHeight) return this.zoomScale.max;
    const { width } = this.getViewportDimensions();
    return (width / target.cellWidth) * 0.80;
  }

  private startDwell(): void {
    const timer = setTimeout(() => {
      if (!this.isPaused) this.scheduleNextCycle();
    }, this.timing.dwell);
    this.stateTransitionTimers.push(timer);
  }

  private startZoomOut(): void {
    this.currentState = this.states.ZOOM_OUT;
    this.zoomContainer.style.transition = `transform ${this.timing.zoomOut}ms ${this.easing.zoomOut}`;
    this.applyZoomTransform(0, 0, this.zoomScale.min);
    this.scheduleIndividualCellChanges(this.timing.zoomOut - 500);

    const stateTimer = setTimeout(() => {
      if (!this.isPaused) {
        this.currentScale  = this.zoomScale.min;
        this.currentTarget = { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };

        if (this.loopEnabled) {
          if (this.glyphChangeSettings.dwellOut.enabled) {
            this.scheduleIndividualCellChanges(this.timing.dwellOut, this.glyphChangeSettings.dwellOut);
          }

          const dwellOutTimer = setTimeout(() => {
            if (!this.isPaused) this.scheduleNextCycle();
          }, this.timing.dwellOut);
          this.stateTransitionTimers.push(dwellOutTimer);
        }
      }
    }, this.timing.zoomOut);
    this.stateTransitionTimers.push(stateTimer);
  }

  // ---------------------------------------------------------------------------
  // Target selection & transforms
  // ---------------------------------------------------------------------------

  private pickRandomTarget(): Target {
    const cellInfo: CellInfo | null = this.glyphGrid.getRandomCell();
    if (!cellInfo) return { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };

    const { width, height } = this.getViewportDimensions();
    return {
      x:          cellInfo.x - width  / 2,
      y:          cellInfo.y - height / 2,
      element:    cellInfo.element,
      cellWidth:  cellInfo.cellWidth,
      cellHeight: cellInfo.cellHeight,
    };
  }

  private applyZoomTransform(targetX: number, targetY: number, scale: number): void {
    const tx = -(targetX * scale);
    const ty = -(targetY * scale);
    this.zoomContainer.style.transform =
      `perspective(1px) translate3d(${tx}px, ${ty}px, 0) scale3d(${scale}, ${scale}, 1)`;
  }

  // ---------------------------------------------------------------------------
  // Glyph-change scheduling
  // ---------------------------------------------------------------------------

  private randomTimeWeightedToMiddle(duration: number, middleBias = 0.1): number {
    const bell    = (Math.random() + Math.random() + Math.random()) / 3;
    const uniform = Math.random();
    const bias    = Math.min(1, Math.max(0, middleBias));
    return (bell * bias + uniform * (1 - bias)) * duration;
  }

  private scheduleIndividualCellChanges(
    duration: number,
    settings: GlyphChangeSettings = this.glyphChangeSettings.zoom,
  ): void {
    this.clearGlyphChangeTimers();
    if (duration <= 0) return;

    const cellCount = this.glyphGrid.getCellCount();
    if (cellCount === 0) return;

    const minChanges  = Math.max(0, Math.floor(settings.minPerCell));
    const maxChanges  = Math.max(minChanges, Math.floor(settings.maxPerCell));
    const middleBias  = settings.middleBias;
    const totalTicks  = Math.max(1, Math.ceil(duration / this.glyphChangeBatchIntervalMs));
    const batches: number[][] = Array.from({ length: totalTicks }, () => []);

    for (let ci = 0; ci < cellCount; ci++) {
      const changes = Math.floor(Math.random() * (maxChanges - minChanges + 1)) + minChanges;
      for (let j = 0; j < changes; j++) {
        const delay   = this.randomTimeWeightedToMiddle(duration, middleBias);
        const tick    = Math.min(totalTicks - 1, Math.floor(delay / this.glyphChangeBatchIntervalMs));
        batches[tick]!.push(ci);
      }
    }

    this.glyphChangeBatches    = batches;
    this.glyphChangeTickIndex  = 0;
    this.glyphChangeTotalTicks = totalTicks;

    this.processGlyphChangeBatchTick();
    if (this.glyphChangeTickIndex < this.glyphChangeTotalTicks) {
      this.glyphChangeTimerId = setInterval(() => {
        this.processGlyphChangeBatchTick();
      }, this.glyphChangeBatchIntervalMs);
    }
  }

  private processGlyphChangeBatchTick(): void {
    if (this.glyphChangeTickIndex >= this.glyphChangeTotalTicks) {
      this.clearGlyphChangeTimers();
      return;
    }

    const batch = this.glyphChangeBatches[this.glyphChangeTickIndex] ?? [];

    if (!this.isPaused && batch.length > 0) {
      const unique    = Array.from(new Set(batch));
      const updateCount = Math.min(this.maxCellUpdatesPerTick, unique.length);

      for (let i = 0; i < updateCount; i++) {
        const cellIndex = unique[i]!;
        const cell      = this.glyphGrid.cells[cellIndex];
        if (cell) this.glyphGrid.updateCell(cell);
      }

      if (unique.length > updateCount) {
        const overflow   = unique.slice(updateCount);
        const nextTick   = this.glyphChangeTickIndex + 1;
        if (nextTick < this.glyphChangeTotalTicks) {
          this.glyphChangeBatches[nextTick]!.push(...overflow);
        }
      }
    }

    this.glyphChangeTickIndex += 1;
    if (this.glyphChangeTickIndex >= this.glyphChangeTotalTicks) {
      this.clearGlyphChangeTimers();
    }
  }

  clearGlyphChangeTimers(): void {
    if (this.glyphChangeTimerId !== null) {
      clearInterval(this.glyphChangeTimerId);
      this.glyphChangeTimerId = null;
    }
    this.glyphChangeBatches    = [];
    this.glyphChangeTickIndex  = 0;
    this.glyphChangeTotalTicks = 0;
  }

  private clearStateTransitionTimers(): void {
    this.stateTransitionTimers.forEach(t => clearTimeout(t));
    this.stateTransitionTimers = [];
  }
}

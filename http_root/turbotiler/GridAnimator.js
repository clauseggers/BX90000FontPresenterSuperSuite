/**
 * GridAnimator.ts
 * Animation controller for TurboTiler BX90000 Fascination
 */
// ---------------------------------------------------------------------------
export class GridAnimator {
    zoomContainer;
    glyphGrid;
    states = {
        ZOOM_IN: 'zoom_in',
        DWELL: 'dwell',
        ZOOM_OUT: 'zoom_out',
    };
    currentState = 'dwell';
    isPaused = false;
    timing = {
        zoomIn: 6000,
        dwell: 1000,
        zoomOut: 6000,
        dwellOut: 1000,
    };
    easing = {
        zoomIn: 'cubic-bezier(0.5, 0, 0.6, 1)',
        zoomOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };
    zoomScale = { min: 0.12, max: 1.0 };
    loopEnabled = true;
    currentScale = 0.12;
    currentTarget = { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };
    nextTarget = null;
    animationFrameId = null;
    stateStartTime = 0;
    glyphChangeTimerId = null;
    glyphChangeBatchIntervalMs = 50;
    maxCellUpdatesPerTick = 12;
    glyphChangeBatches = [];
    glyphChangeTickIndex = 0;
    glyphChangeTotalTicks = 0;
    glyphChangeSettings = {
        zoom: {
            minPerCell: 4,
            maxPerCell: 10,
            middleBias: 0.05,
        },
        dwellOut: {
            enabled: true,
            minPerCell: 0,
            maxPerCell: 1,
            middleBias: 0,
        },
    };
    stateTransitionTimers = [];
    constructor(zoomContainer, glyphGrid) {
        this.zoomContainer = zoomContainer;
        this.glyphGrid = glyphGrid;
        this.currentScale = this.zoomScale.min;
    }
    // ---------------------------------------------------------------------------
    // Viewport helpers
    // ---------------------------------------------------------------------------
    getViewportDimensions() {
        const el = this.zoomContainer.parentElement;
        return {
            width: el?.clientWidth ?? window.innerWidth,
            height: el?.clientHeight ?? window.innerHeight,
        };
    }
    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    start() {
        this.clearGlyphChangeTimers();
        this.clearStateTransitionTimers();
        this.isPaused = false;
        this.stateStartTime = performance.now();
        const centerCell = this.glyphGrid.getCenterCell() ?? this.pickRandomTarget();
        this.nextTarget = centerCell;
        this.currentTarget = centerCell;
        const initialScale = this.calculateCellFitScale(this.currentTarget);
        this.currentScale = initialScale;
        this.zoomContainer.style.transition = 'none';
        this.applyZoomTransform(this.currentTarget.x, this.currentTarget.y, initialScale);
        void this.zoomContainer.offsetHeight;
        this.zoomContainer.style.transition = `transform ${this.timing.zoomOut}ms ${this.easing.zoomOut}`;
        this.currentState = this.states.ZOOM_OUT;
        const initialTimer = setTimeout(() => {
            if (!this.isPaused)
                this.startZoomOut();
        }, 500);
        this.stateTransitionTimers.push(initialTimer);
    }
    reset() {
        this.clearGlyphChangeTimers();
        this.clearStateTransitionTimers();
        this.currentState = this.states.DWELL;
        this.isPaused = false;
        this.currentScale = this.zoomScale.min;
        this.currentTarget = { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };
        this.nextTarget = null;
        this.zoomContainer.style.transition = 'none';
        this.zoomContainer.style.transform =
            `perspective(1px) translate3d(0px, 0px, 0) scale3d(${this.zoomScale.min}, ${this.zoomScale.min}, 1)`;
        void this.zoomContainer.offsetHeight;
        void this.zoomContainer.offsetWidth;
        setTimeout(() => { this.zoomContainer.style.transition = ''; }, 0);
    }
    pause() {
        this.isPaused = true;
        this.clearGlyphChangeTimers();
        this.clearStateTransitionTimers();
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    resume() {
        if (!this.isPaused)
            return;
        this.isPaused = false;
        this.stateStartTime = performance.now();
        this.scheduleNextCycle();
    }
    destroy() {
        this.pause();
        this.clearGlyphChangeTimers();
    }
    // ---------------------------------------------------------------------------
    // State machine
    // ---------------------------------------------------------------------------
    scheduleNextCycle() {
        if (this.isPaused)
            return;
        if (!this.loopEnabled && this.currentState === this.states.ZOOM_OUT)
            return;
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
    startZoomIn() {
        this.nextTarget = this.pickRandomTarget();
        this.zoomContainer.style.transition = `transform ${this.timing.zoomIn}ms ${this.easing.zoomIn}`;
        const targetScale = this.calculateCellFitScale(this.nextTarget);
        this.applyZoomTransform(this.nextTarget.x, this.nextTarget.y, targetScale);
        this.scheduleIndividualCellChanges(this.timing.zoomIn - 500);
        const timer = setTimeout(() => {
            if (!this.isPaused) {
                this.currentScale = targetScale;
                this.currentTarget = this.nextTarget;
                this.scheduleNextCycle();
            }
        }, this.timing.zoomIn);
        this.stateTransitionTimers.push(timer);
    }
    calculateCellFitScale(target) {
        if (!target.cellWidth || !target.cellHeight)
            return this.zoomScale.max;
        const { width } = this.getViewportDimensions();
        return (width / target.cellWidth) * 0.80;
    }
    startDwell() {
        const timer = setTimeout(() => {
            if (!this.isPaused)
                this.scheduleNextCycle();
        }, this.timing.dwell);
        this.stateTransitionTimers.push(timer);
    }
    startZoomOut() {
        this.currentState = this.states.ZOOM_OUT;
        this.zoomContainer.style.transition = `transform ${this.timing.zoomOut}ms ${this.easing.zoomOut}`;
        this.applyZoomTransform(0, 0, this.zoomScale.min);
        this.scheduleIndividualCellChanges(this.timing.zoomOut - 500);
        const stateTimer = setTimeout(() => {
            if (!this.isPaused) {
                this.currentScale = this.zoomScale.min;
                this.currentTarget = { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };
                if (this.loopEnabled) {
                    if (this.glyphChangeSettings.dwellOut.enabled) {
                        this.scheduleIndividualCellChanges(this.timing.dwellOut, this.glyphChangeSettings.dwellOut);
                    }
                    const dwellOutTimer = setTimeout(() => {
                        if (!this.isPaused)
                            this.scheduleNextCycle();
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
    pickRandomTarget() {
        const cellInfo = this.glyphGrid.getRandomCell();
        if (!cellInfo)
            return { x: 0, y: 0, cellWidth: 0, cellHeight: 0 };
        const { width, height } = this.getViewportDimensions();
        return {
            x: cellInfo.x - width / 2,
            y: cellInfo.y - height / 2,
            element: cellInfo.element,
            cellWidth: cellInfo.cellWidth,
            cellHeight: cellInfo.cellHeight,
        };
    }
    applyZoomTransform(targetX, targetY, scale) {
        const tx = -(targetX * scale);
        const ty = -(targetY * scale);
        this.zoomContainer.style.transform =
            `perspective(1px) translate3d(${tx}px, ${ty}px, 0) scale3d(${scale}, ${scale}, 1)`;
    }
    // ---------------------------------------------------------------------------
    // Glyph-change scheduling
    // ---------------------------------------------------------------------------
    randomTimeWeightedToMiddle(duration, middleBias = 0.1) {
        const bell = (Math.random() + Math.random() + Math.random()) / 3;
        const uniform = Math.random();
        const bias = Math.min(1, Math.max(0, middleBias));
        return (bell * bias + uniform * (1 - bias)) * duration;
    }
    scheduleIndividualCellChanges(duration, settings = this.glyphChangeSettings.zoom) {
        this.clearGlyphChangeTimers();
        if (duration <= 0)
            return;
        const cellCount = this.glyphGrid.getCellCount();
        if (cellCount === 0)
            return;
        const minChanges = Math.max(0, Math.floor(settings.minPerCell));
        const maxChanges = Math.max(minChanges, Math.floor(settings.maxPerCell));
        const middleBias = settings.middleBias;
        const totalTicks = Math.max(1, Math.ceil(duration / this.glyphChangeBatchIntervalMs));
        const batches = Array.from({ length: totalTicks }, () => []);
        for (let ci = 0; ci < cellCount; ci++) {
            const changes = Math.floor(Math.random() * (maxChanges - minChanges + 1)) + minChanges;
            for (let j = 0; j < changes; j++) {
                const delay = this.randomTimeWeightedToMiddle(duration, middleBias);
                const tick = Math.min(totalTicks - 1, Math.floor(delay / this.glyphChangeBatchIntervalMs));
                batches[tick].push(ci);
            }
        }
        this.glyphChangeBatches = batches;
        this.glyphChangeTickIndex = 0;
        this.glyphChangeTotalTicks = totalTicks;
        this.processGlyphChangeBatchTick();
        if (this.glyphChangeTickIndex < this.glyphChangeTotalTicks) {
            this.glyphChangeTimerId = setInterval(() => {
                this.processGlyphChangeBatchTick();
            }, this.glyphChangeBatchIntervalMs);
        }
    }
    processGlyphChangeBatchTick() {
        if (this.glyphChangeTickIndex >= this.glyphChangeTotalTicks) {
            this.clearGlyphChangeTimers();
            return;
        }
        const batch = this.glyphChangeBatches[this.glyphChangeTickIndex] ?? [];
        if (!this.isPaused && batch.length > 0) {
            const unique = Array.from(new Set(batch));
            const updateCount = Math.min(this.maxCellUpdatesPerTick, unique.length);
            for (let i = 0; i < updateCount; i++) {
                const cellIndex = unique[i];
                const cell = this.glyphGrid.cells[cellIndex];
                if (cell)
                    this.glyphGrid.updateCell(cell);
            }
            if (unique.length > updateCount) {
                const overflow = unique.slice(updateCount);
                const nextTick = this.glyphChangeTickIndex + 1;
                if (nextTick < this.glyphChangeTotalTicks) {
                    this.glyphChangeBatches[nextTick].push(...overflow);
                }
            }
        }
        this.glyphChangeTickIndex += 1;
        if (this.glyphChangeTickIndex >= this.glyphChangeTotalTicks) {
            this.clearGlyphChangeTimers();
        }
    }
    clearGlyphChangeTimers() {
        if (this.glyphChangeTimerId !== null) {
            clearInterval(this.glyphChangeTimerId);
            this.glyphChangeTimerId = null;
        }
        this.glyphChangeBatches = [];
        this.glyphChangeTickIndex = 0;
        this.glyphChangeTotalTicks = 0;
    }
    clearStateTransitionTimers() {
        this.stateTransitionTimers.forEach(t => clearTimeout(t));
        this.stateTransitionTimers = [];
    }
}
//# sourceMappingURL=GridAnimator.js.map
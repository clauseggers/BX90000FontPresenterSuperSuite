/**
 * GridAnimator.ts
 * Animation controller for TurboTiler BX90000 Fascination
 */
import type { GlyphGrid } from './GlyphGrid.js';
interface ZoomScale {
    min: number;
    max: number;
}
export declare class GridAnimator {
    private readonly zoomContainer;
    private readonly glyphGrid;
    private readonly states;
    private currentState;
    isPaused: boolean;
    private readonly timing;
    private readonly easing;
    zoomScale: ZoomScale;
    loopEnabled: boolean;
    private currentScale;
    private currentTarget;
    private nextTarget;
    private animationFrameId;
    private stateStartTime;
    private glyphChangeTimerId;
    private readonly glyphChangeBatchIntervalMs;
    private readonly maxCellUpdatesPerTick;
    private glyphChangeBatches;
    private glyphChangeTickIndex;
    private glyphChangeTotalTicks;
    private readonly glyphChangeSettings;
    private stateTransitionTimers;
    constructor(zoomContainer: HTMLElement, glyphGrid: GlyphGrid);
    private getViewportDimensions;
    start(): void;
    reset(): void;
    pause(): void;
    resume(): void;
    destroy(): void;
    private scheduleNextCycle;
    private startZoomIn;
    private calculateCellFitScale;
    private startDwell;
    private startZoomOut;
    private pickRandomTarget;
    private applyZoomTransform;
    private randomTimeWeightedToMiddle;
    private scheduleIndividualCellChanges;
    private processGlyphChangeBatchTick;
    clearGlyphChangeTimers(): void;
    private clearStateTransitionTimers;
}
export {};
//# sourceMappingURL=GridAnimator.d.ts.map
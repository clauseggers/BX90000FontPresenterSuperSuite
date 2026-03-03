/**
 * TurboTiler.ts
 * Main controller for TurboTiler BX90000 Fascination
 */
import { FontLoader } from '../core/FontLoader.js';
export declare class TurboTiler {
    readonly fontLoader: FontLoader;
    private readonly uiControls;
    private readonly dragAndDrop;
    private readonly glyphGrid;
    private readonly gridAnimator;
    private readonly zoomContainer;
    private readonly gridContainer;
    private currentFont;
    private currentFontFamily;
    private resizeTimeouts;
    private readonly _keyHandler;
    private readonly _resizeHandler;
    constructor();
    private setupEventListeners;
    private handleKeyPress;
    private handleResize;
    private scheduleViewportRebuilds;
    private rebuildForViewportChange;
    private handleFontDrop;
    private handleFontLoaded;
    private handleError;
    private extractGlyphs;
    private extractAxes;
    private extractFeatures;
    private populateGrid;
    private syncZoomOutScaleToViewport;
    destroy(): void;
}
//# sourceMappingURL=TurboTiler.d.ts.map
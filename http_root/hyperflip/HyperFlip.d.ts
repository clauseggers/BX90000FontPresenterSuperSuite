import { FontLoader } from '../core/FontLoader.js';
declare class FontViewer {
    readonly fontLoader: FontLoader;
    private readonly glyphAnimator;
    private readonly metricsOverlay;
    private readonly variationAxes;
    private readonly uiControls;
    private readonly dragAndDrop;
    private readonly _resizeObserver;
    private readonly _keyHandler;
    constructor();
    private setupEventListeners;
    private setupSliderControls;
    private handleFontDrop;
    private handleFontLoaded;
    private handleGlyphChange;
    private handleError;
    private handleAxesChange;
    private handleKeyPress;
    private _saveHyperFlipState;
    private _restoreHyperFlipState;
    /** Called by AppShell before the DOM is torn down. */
    destroy(): void;
}
export default FontViewer;
//# sourceMappingURL=HyperFlip.d.ts.map
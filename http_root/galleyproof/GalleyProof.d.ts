import { FontLoader } from '../core/FontLoader.js';
export declare class GalleyProof {
    readonly fontLoader: FontLoader;
    private readonly uiControls;
    private readonly dragAndDrop;
    private readonly openTypeFeatures;
    private readonly variationAxes;
    private readonly container;
    private currentVariationSettings;
    private readonly _keyHandler;
    constructor();
    private initializeSliders;
    /** Generic slider wiring helper. */
    private initSlider;
    private setupEventListeners;
    private loadText;
    private handleFontLoaded;
    private updateFeatures;
    destroy(): void;
}
//# sourceMappingURL=GalleyProof.d.ts.map
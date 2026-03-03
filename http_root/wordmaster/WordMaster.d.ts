import { FontLoader } from '../core/FontLoader.js';
export declare class WordAnimator {
    readonly fontLoader: FontLoader;
    private readonly uiControls;
    private readonly dragAndDrop;
    private readonly textFitter;
    private readonly openTypeFeatures;
    private readonly variationAxes;
    private readonly container;
    private wordList;
    private processedWordList;
    private animationTimer;
    private fadeTimer;
    private currentVariationSettings;
    private paddingPercentage;
    private animationDelay;
    private isAnimating;
    private readonly _keyHandler;
    private readonly _resizeHandler;
    constructor();
    private updateFeatures;
    private initializeSliders;
    private setupEventListeners;
    private handleKeyPress;
    private loadWordList;
    private processWordList;
    private handleFontLoaded;
    start(interval?: number): Promise<void>;
    stop(): void;
    private scheduleNextUpdate;
    private updateWord;
    private getRandomWord;
    destroy(): void;
}
//# sourceMappingURL=WordMaster.d.ts.map
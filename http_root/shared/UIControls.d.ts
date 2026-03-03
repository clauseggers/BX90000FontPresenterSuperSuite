export declare class UIControls {
    private isDarkMode;
    private activeColour;
    private isFullscreen;
    private readonly _fullscreenHandler;
    constructor();
    private _applyStoredColorScheme;
    setupSharedButtons(): void;
    private _setupEventListeners;
    /** Removes all document-level listeners added by this instance. */
    destroy(): void;
    toggleFullscreen(): void;
    private enterFullscreen;
    private exitFullscreen;
    private handleFullscreenChange;
    toggleColorScheme(): void;
}
//# sourceMappingURL=UIControls.d.ts.map
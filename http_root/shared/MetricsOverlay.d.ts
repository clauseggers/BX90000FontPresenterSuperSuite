export declare class MetricsOverlay {
    private readonly overlay;
    isVisible: boolean;
    constructor(overlayElement?: HTMLElement | null);
    render(font: opentype.Font | null, glyphElement: HTMLElement | null): void;
    private calculateMetrics;
    private renderMetricLines;
    private renderBearingLines;
    toggle(): void;
}
//# sourceMappingURL=MetricsOverlay.d.ts.map
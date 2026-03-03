import type { FontInformation } from '../core/Types.js';
export declare class OpenTypeFeatures {
    private activeFeatures;
    private availableFeatures;
    private featureNames;
    private readonly buttonsContainer;
    private readonly onFeaturesChanged?;
    constructor(onFeaturesChanged?: ((featureString: string) => void) | null);
    extractFeatures(fontInfo: FontInformation, font: opentype.Font, buffer: ArrayBuffer): Set<string>;
    private getNameFromFont;
    private extractSSNamesFromBuffer;
    private processFeatures;
    private processGsubTable;
    createButtons(): void;
    private updateButtonText;
    private toggleFeature;
    getFeatureString(): string;
    clear(): void;
}
//# sourceMappingURL=OpenTypeFeatures.d.ts.map
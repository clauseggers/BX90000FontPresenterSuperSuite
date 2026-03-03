export interface TextFitterOptions {
    paddingPercentage?: number;
}
export declare class TextFitter {
    paddingPercentage: number;
    constructor({ paddingPercentage }?: TextFitterOptions);
    fitText(element: HTMLElement, container: HTMLElement): void;
}
//# sourceMappingURL=TextFitter.d.ts.map
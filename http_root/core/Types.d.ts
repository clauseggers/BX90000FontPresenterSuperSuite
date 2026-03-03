export declare const AXIS_NAMES: {
    readonly wght: "Weight";
    readonly wdth: "Width";
    readonly ital: "Italic";
    readonly slnt: "Slant";
    readonly opsz: "Optical Size";
};
export type KnownAxisTag = keyof typeof AXIS_NAMES;
export interface FontMetrics {
    readonly ascender: number;
    readonly descender: number;
    readonly xHeight: number;
    readonly capHeight: number;
    readonly unitsPerEm: number;
}
export interface AxisDefinition {
    readonly tag: string;
    readonly name: string;
    readonly min: number;
    readonly max: number;
    readonly default: number;
}
export interface VariableInstance {
    readonly name: string;
    readonly coordinates: Record<string, number>;
}
export interface FontOpenTypeFeature {
    readonly tag: string;
    readonly scripts: number[];
}
export interface FontInformation {
    readonly filename: string;
    readonly fontFamily: string;
    readonly fullName: string;
    readonly version: string;
    readonly copyright: string;
    readonly manufacturer: string;
    readonly manufacturerURL: string;
    readonly designer: string;
    readonly designerURL: string;
    readonly license: string;
    readonly licenseURL: string;
    readonly vendorID: string;
    readonly format: string;
    readonly unitsPerEm: number | string;
    readonly created: string;
    readonly modified: string;
    readonly glyphCount: number;
    readonly isFixedPitch: string;
    readonly fontStyle: string;
    readonly features: FontOpenTypeFeature[];
    readonly axes: AxisDefinition[];
    readonly instances: VariableInstance[];
}
export interface FontLoadResult {
    readonly font: opentype.Font;
    readonly fontInfo: FontInformation;
    readonly fontFamily: string;
    readonly buffer: ArrayBuffer;
}
export interface FontLoaderOptions {
    onFontLoaded?: (result: FontLoadResult) => void;
    onError?: (error: Error) => void;
}
//# sourceMappingURL=Types.d.ts.map
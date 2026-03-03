// =============================================================================
// core/Types.ts
// Shared type definitions and constants used across the entire suite.
// =============================================================================

// ---------------------------------------------------------------------------
// Well-known variable-font axis tags and their display names
// ---------------------------------------------------------------------------

export const AXIS_NAMES = {
  wght: 'Weight',
  wdth: 'Width',
  ital: 'Italic',
  slnt: 'Slant',
  opsz: 'Optical Size',
} as const satisfies Record<string, string>;

export type KnownAxisTag = keyof typeof AXIS_NAMES;

// ---------------------------------------------------------------------------
// Font metrics (all values in font units)
// ---------------------------------------------------------------------------

export interface FontMetrics {
  readonly ascender:   number;
  readonly descender:  number;
  readonly xHeight:    number;
  readonly capHeight:  number;
  readonly unitsPerEm: number;
}

// ---------------------------------------------------------------------------
// Variable-font axis definition
// ---------------------------------------------------------------------------

export interface AxisDefinition {
  readonly tag:     string;
  readonly name:    string;
  readonly min:     number;
  readonly max:     number;
  readonly default: number;
}

// ---------------------------------------------------------------------------
// Named instance (from fvar)
// ---------------------------------------------------------------------------

export interface VariableInstance {
  readonly name:        string;
  readonly coordinates: Record<string, number>;
}

// ---------------------------------------------------------------------------
// OpenType feature record (used in FontInformation.features)
// ---------------------------------------------------------------------------

export interface FontOpenTypeFeature {
  readonly tag:     string;
  readonly scripts: number[];
}

// ---------------------------------------------------------------------------
// The canonical font-information object produced by getFontInformation()
// ---------------------------------------------------------------------------

export interface FontInformation {
  readonly filename:        string;
  readonly fontFamily:      string;
  readonly fullName:        string;
  readonly version:         string;
  readonly copyright:       string;
  readonly manufacturer:    string;
  readonly manufacturerURL: string;
  readonly designer:        string;
  readonly designerURL:     string;
  readonly license:         string;
  readonly licenseURL:      string;
  readonly vendorID:        string;
  readonly format:          string;
  readonly unitsPerEm:      number | string;
  readonly created:         string;
  readonly modified:        string;
  readonly glyphCount:      number;
  readonly isFixedPitch:    string;
  readonly fontStyle:       string;
  readonly features:        FontOpenTypeFeature[];
  readonly axes:            AxisDefinition[];
  readonly instances:       VariableInstance[];
}

// ---------------------------------------------------------------------------
// Result returned by FontLoader.loadFont()
// ---------------------------------------------------------------------------

export interface FontLoadResult {
  readonly font:       opentype.Font;
  readonly fontInfo:   FontInformation;
  readonly fontFamily: string;
  readonly buffer:     ArrayBuffer;
}

// ---------------------------------------------------------------------------
// FontLoader constructor options
// ---------------------------------------------------------------------------

export interface FontLoaderOptions {
  onFontLoaded?: (result: FontLoadResult) => void;
  onError?:      (error: Error) => void;
}

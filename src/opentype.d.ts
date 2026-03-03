// =============================================================================
// opentype.d.ts
// Ambient type declarations for the opentype.js library, which is loaded as a
// plain <script> tag and therefore exposes a global `opentype` namespace.
// =============================================================================

/**
 * A language-keyed map of strings, e.g. { en: "Helvetica", "en-US": "Helvetica" }.
 */
interface OpentypeNameEntry {
  [languageCode: string]: string;
}

/**
 * The Windows platform subtable inside font.names, which opentype.js enriches
 * with friendly property aliases (fontFamily, fullName, …) alongside the
 * numeric Name-ID index signature.
 */
interface OpentypeWindowsPlatformNames {
  /** Index by numeric Name ID (e.g. 1 = fontFamily, 4 = fullName …) */
  [nameId: number]: OpentypeNameEntry | undefined;
  /** String aliases added by opentype.js */
  [key: string]: OpentypeNameEntry | undefined;
  fontFamily?: OpentypeNameEntry;         // Name ID 1
  fontSubfamily?: OpentypeNameEntry;      // Name ID 2
  uniqueID?: OpentypeNameEntry;           // Name ID 3
  fullName?: OpentypeNameEntry;           // Name ID 4
  version?: OpentypeNameEntry;            // Name ID 5
  postScriptName?: OpentypeNameEntry;     // Name ID 6
  trademark?: OpentypeNameEntry;          // Name ID 7
  manufacturer?: OpentypeNameEntry;       // Name ID 8
  designer?: OpentypeNameEntry;           // Name ID 9
  description?: OpentypeNameEntry;        // Name ID 10
  manufacturerURL?: OpentypeNameEntry;    // Name ID 11
  designerURL?: OpentypeNameEntry;        // Name ID 12
  license?: OpentypeNameEntry;            // Name ID 13
  licenseURL?: OpentypeNameEntry;         // Name ID 14
  preferredFamily?: OpentypeNameEntry;    // Name ID 16
  preferredSubfamily?: OpentypeNameEntry; // Name ID 17
  copyright?: OpentypeNameEntry;          // Name ID 0
}

/** Generic platform names table (macintosh / unicode). */
interface OpentypePlatformNames {
  [nameId: number]: OpentypeNameEntry | undefined;
  [key: string]: OpentypeNameEntry | undefined;
}

interface OpentypeFontNames {
  windows?:   OpentypeWindowsPlatformNames;
  macintosh?: OpentypePlatformNames;
  unicode?:   OpentypePlatformNames;
  /** opentype.js also allows direct top-level access in some builds */
  [key: string]: OpentypeWindowsPlatformNames | OpentypePlatformNames | undefined;
}

interface OpentypeGlyph {
  readonly name: string;
  readonly unicode?: number;
  readonly advanceWidth: number;
  readonly xMin?: number;
  readonly xMax?: number;
  readonly yMin?: number;
  readonly yMax?: number;
}

interface OpentypeGlyphSet {
  readonly length: number;
  get(index: number): OpentypeGlyph;
}

interface OpentypeFvarAxis {
  readonly tag: string;
  readonly name: { en?: string; [lang: string]: string | undefined };
  readonly minValue: number;
  readonly maxValue: number;
  readonly defaultValue: number;
}

interface OpentypeFvarInstance {
  readonly name: { [lang: string]: string } | string | null;
  readonly coordinates: Record<string, number>;
}

interface OpentypeFvarTable {
  readonly axes: OpentypeFvarAxis[];
  readonly instances: OpentypeFvarInstance[];
}

interface OpentypeOS2Table {
  readonly sTypoAscender: number;
  readonly sTypoDescender: number;
  readonly sCapHeight: number;
  readonly sxHeight: number;
  readonly sSmallCapHeight?: number;
  readonly fsSelection: number;
  readonly achVendID: string;
}

interface OpentypeHeadTable {
  readonly unitsPerEm: number;
  readonly created: number;
  readonly modified: number;
  readonly macStyle: number;
}

interface OpentypePostTable {
  readonly isFixedPitch: number;
}

interface OpentypeGsubFeature {
  readonly tag: string;
  readonly feature: {
    readonly lookupListIndexes: number[];
  };
}

interface OpentypeGsubTable {
  readonly features: OpentypeGsubFeature[];
  readonly lookups?: ReadonlyArray<{
    readonly features?: OpentypeGsubFeature[];
  }>;
}

interface OpentypeAvarAxisValueMap {
  readonly fromCoordinate: number;
  readonly toCoordinate: number;
}

interface OpentypeAvarAxisSegmentMap {
  readonly axisValueMaps: OpentypeAvarAxisValueMap[];
}

interface OpentypeAvarTable {
  readonly axisSegmentMaps: OpentypeAvarAxisSegmentMap[];
}

interface OpentypeTables {
  readonly os2?:  OpentypeOS2Table;
  readonly head?: OpentypeHeadTable;
  readonly fvar?: OpentypeFvarTable;
  readonly gsub?: OpentypeGsubTable;
  readonly post?: OpentypePostTable;
  readonly avar?: OpentypeAvarTable;
}

interface OpentypeFont {
  readonly names: OpentypeFontNames;
  readonly tables: OpentypeTables;
  readonly glyphs: OpentypeGlyphSet;
  readonly outlinesFormat: string;
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  charToGlyphIndex(char: string): number;
}

// ---------------------------------------------------------------------------
// Global namespace — mirrors the value exposed by the <script> tag
// ---------------------------------------------------------------------------

declare namespace opentype {
  type NameEntry          = OpentypeNameEntry;
  type WindowsPlatformNames = OpentypeWindowsPlatformNames;
  type PlatformNames      = OpentypePlatformNames;
  type FontNames          = OpentypeFontNames;
  type Glyph              = OpentypeGlyph;
  type GlyphSet           = OpentypeGlyphSet;
  type FvarAxis           = OpentypeFvarAxis;
  type FvarInstance       = OpentypeFvarInstance;
  type FvarTable          = OpentypeFvarTable;
  type OS2Table           = OpentypeOS2Table;
  type HeadTable          = OpentypeHeadTable;
  type PostTable          = OpentypePostTable;
  type GsubFeature        = OpentypeGsubFeature;
  type GsubTable          = OpentypeGsubTable;
  type AvarAxisValueMap   = OpentypeAvarAxisValueMap;
  type AvarAxisSegmentMap = OpentypeAvarAxisSegmentMap;
  type AvarTable          = OpentypeAvarTable;
  type Tables             = OpentypeTables;
  type Font               = OpentypeFont;

  function parse(buffer: ArrayBuffer): Font;
}

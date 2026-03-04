// =============================================================================
// wordmaster/OpenTypeFeatures.ts
// =============================================================================

import type { FontInformation } from '../core/Types.js';
import { saveOpenTypeFeatures, getSavedOpenTypeFeatures } from '../shared/FontSession.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface FeatureRecord {
  tag: string;
  feature?: { lookupListIndexes: number[] };
}

interface GsubLike {
  features?: FeatureRecord[] | Record<string, unknown>;
  lookups?: Array<{ features?: FeatureRecord[] }>;
}

interface FontInfoLike {
  features?: FeatureRecord[] | Record<string, unknown>;
  tables?: { GSUB?: GsubLike };
  GSUB?: GsubLike;
  opentype?: { tables?: { GSUB?: GsubLike } };
  [key: string]: unknown;
}

export class OpenTypeFeatures {
  private activeFeatures:   Set<string> = new Set();
  private availableFeatures: Set<string> = new Set();
  private featureNames:     Map<string, string> = new Map();

  private readonly buttonsContainer: Element | null;
  private readonly onFeaturesChanged?: ((featureString: string) => void) | null;

  constructor(onFeaturesChanged?: ((featureString: string) => void) | null) {
    this.onFeaturesChanged = onFeaturesChanged;
    this.buttonsContainer  = document.querySelector('.buttons-container');
  }

  extractFeatures(fontInfo: FontInformation, font: opentype.Font, buffer: ArrayBuffer): Set<string> {
    const features: Set<string> = new Set();
    this.featureNames = new Map();

    try {
      const info = fontInfo as unknown as FontInfoLike;

      if (info.features) {
        this.processFeatures(info.features, features);
      }

      if (info.tables?.GSUB) {
        this.processGsubTable(info.tables.GSUB, features);
      }

      if (info.GSUB) {
        this.processGsubTable(info.GSUB, features);
      }

      if (info.opentype?.tables?.GSUB) {
        this.processGsubTable(info.opentype.tables.GSUB, features);
      }

      // Walk top-level keys looking for an opentype-like object
      for (const key of Object.keys(info)) {
        const val = info[key];
        if (typeof val === 'object' && val !== null) {
          const obj = val as FontInfoLike;
          if (obj.features) this.processFeatures(obj.features, features);
          if (obj.GSUB)     this.processGsubTable(obj.GSUB, features);
        }
      }

      // Extract Stylistic Set display names from the raw GSUB binary
      this.extractSSNamesFromBuffer(buffer, font);

    } catch (err) {
      console.error('Error extracting OpenType features:', err);
    }

    this.availableFeatures = features;
    return features;
  }

  private getNameFromFont(font: opentype.Font, nameId: number): string | null {
    const platforms    = ['windows', 'macintosh', 'unicode'] as const;
    const languageCodes = ['en', 'en-US', 'en-GB', 'und', '0'];

    for (const platform of platforms) {
      const platformNames = font.names[platform as string];
      if (!platformNames) continue;
      const entry = platformNames[nameId];
      if (!entry) continue;
      for (const code of languageCodes) {
        const val = entry[code];
        if (val) return val;
      }
      const keys = Object.keys(entry);
      if (keys.length > 0) return entry[keys[0]!] ?? null;
    }
    return null;
  }

  private extractSSNamesFromBuffer(buffer: ArrayBuffer, font: opentype.Font): void {
    try {
      const data     = new DataView(buffer);
      const tag      = String.fromCharCode(
        data.getUint8(0), data.getUint8(1), data.getUint8(2), data.getUint8(3),
      );
      const sfntOffset = tag === 'ttcf' ? data.getUint32(12) : 0;

      const numTables = data.getUint16(sfntOffset + 4);
      let gsubOffset  = -1;
      for (let i = 0; i < numTables; i++) {
        const rec      = sfntOffset + 12 + i * 16;
        const tableTag = String.fromCharCode(
          data.getUint8(rec), data.getUint8(rec + 1),
          data.getUint8(rec + 2), data.getUint8(rec + 3),
        );
        if (tableTag === 'GSUB') {
          gsubOffset = data.getUint32(rec + 8);
          break;
        }
      }
      if (gsubOffset < 0) return;

      const featureListOffset = data.getUint16(gsubOffset + 6);
      const featureListAbs    = gsubOffset + featureListOffset;
      const featureCount      = data.getUint16(featureListAbs);

      for (let i = 0; i < featureCount; i++) {
        const recAbs     = featureListAbs + 2 + i * 6;
        const featureTag = String.fromCharCode(
          data.getUint8(recAbs), data.getUint8(recAbs + 1),
          data.getUint8(recAbs + 2), data.getUint8(recAbs + 3),
        );

        if (!featureTag.startsWith('ss') || this.featureNames.has(featureTag)) continue;

        const featureOffset  = data.getUint16(recAbs + 4);
        const featureAbs     = featureListAbs + featureOffset;
        const featureParamsOffset = data.getUint16(featureAbs);
        if (featureParamsOffset === 0) continue;

        const ssParamsAbs = featureAbs + featureParamsOffset;
        const uiNameID    = data.getUint16(ssParamsAbs + 2);
        if (uiNameID === 0) continue;

        const name = this.getNameFromFont(font, uiNameID);
        if (name) this.featureNames.set(featureTag, name);
      }
    } catch (err) {
      console.error('Error parsing GSUB featureParams from buffer:', err);
    }
  }

  private processFeatures(
    features: FeatureRecord[] | Record<string, unknown>,
    featureSet: Set<string>,
  ): void {
    const accepts = (tag: string) => tag === 'smcp' || tag.startsWith('ss');

    if (Array.isArray(features)) {
      for (const feature of features) {
        const tag = typeof feature === 'string' ? feature : feature.tag;
        if (tag && accepts(tag)) featureSet.add(tag);
      }
    } else {
      for (const key of Object.keys(features)) {
        if (accepts(key)) featureSet.add(key);
      }
    }
  }

  private processGsubTable(gsub: GsubLike, featureSet: Set<string>): void {
    if (gsub.features) this.processFeatures(gsub.features, featureSet);
    if (gsub.lookups) {
      for (const lookup of gsub.lookups) {
        if (lookup.features) this.processFeatures(lookup.features, featureSet);
      }
    }
  }

  createButtons(): void {
    if (!this.buttonsContainer) return;

    this.buttonsContainer.querySelectorAll('.feature-button').forEach(btn => btn.remove());

    const wrapper = this.buttonsContainer.querySelector('.feature-buttons-wrapper') ?? this.buttonsContainer;

    const savedFeatures = getSavedOpenTypeFeatures();
    if (savedFeatures) {
      for (const tag of savedFeatures) {
        if (this.availableFeatures.has(tag)) this.activeFeatures.add(tag);
      }
    }

    for (const feature of this.availableFeatures) {
      const button = document.createElement('button');
      button.className = 'feature-button';
      this.updateButton(button, feature);
      button.addEventListener('click', () => { this.toggleFeature(feature, button); });
      wrapper.appendChild(button);
    }

    if (this.activeFeatures.size > 0) {
      this.onFeaturesChanged?.(this.getFeatureString());
    }
  }

  private updateButton(button: HTMLButtonElement, feature: string): void {
    const isEnabled       = this.activeFeatures.has(feature);
    const displayTag      = feature.toUpperCase();
    const descriptiveName = this.featureNames.get(feature);
    button.textContent    = descriptiveName ? `${displayTag} ${descriptiveName}` : displayTag;
    button.classList.toggle('active', isEnabled);
  }

  private toggleFeature(feature: string, button: HTMLButtonElement): string {
    if (this.activeFeatures.has(feature)) {
      this.activeFeatures.delete(feature);
    } else {
      this.activeFeatures.add(feature);
    }

    this.updateButton(button, feature);
    saveOpenTypeFeatures(Array.from(this.activeFeatures));
    const featureString = this.getFeatureString();
    this.onFeaturesChanged?.(featureString);
    return featureString;
  }

  getFeatureString(): string {
    if (this.activeFeatures.size === 0) return 'normal';
    return Array.from(this.activeFeatures)
      .map(f => `"${f}" 1`)
      .join(', ');
  }

  clear(): void {
    this.activeFeatures.clear();
    this.availableFeatures.clear();
    this.featureNames.clear();
  }
}

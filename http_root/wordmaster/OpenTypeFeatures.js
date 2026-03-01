// =============================================================================
// wordmaster/OpenTypeFeatures.js
// =============================================================================

class OpenTypeFeatures {
  constructor(onFeaturesChanged) {
    this.activeFeatures = new Set();
    this.availableFeatures = new Set();
    this.featureNames = new Map();
    this.buttonsContainer = document.querySelector('.buttons-container');
    this.onFeaturesChanged = onFeaturesChanged;
  }

  extractFeatures(fontInfo, font, buffer) {
    const features = new Set();
    this.featureNames = new Map();

    try {
      if (fontInfo.features) {
        this.processFeatures(fontInfo.features, features);
      }

      if (fontInfo.tables && fontInfo.tables.GSUB) {
        this.processGsubTable(fontInfo.tables.GSUB, features);
      }

      if (fontInfo.GSUB) {
        this.processGsubTable(fontInfo.GSUB, features);
      }

      if (fontInfo.opentype && fontInfo.opentype.tables) {
        const gsub = fontInfo.opentype.tables.GSUB;
        if (gsub) {
          this.processGsubTable(gsub, features);
        }
      }

      let opentype = null;
      Object.keys(fontInfo).forEach(key => {
        if (typeof fontInfo[key] === 'object' && fontInfo[key] !== null) {
          if (fontInfo[key].features || fontInfo[key].GSUB) {
            opentype = fontInfo[key];
          }
        }
      });

      if (opentype) {
        if (opentype.features) {
          this.processFeatures(opentype.features, features);
        }
        if (opentype.GSUB) {
          this.processGsubTable(opentype.GSUB, features);
        }
      }

      // Extract descriptive names for Stylistic Sets by reading raw GSUB featureParams
      // In opentype.js, featureParams is a raw Offset16 number, not a parsed object,
      // so we must manually navigate the binary buffer to reach the StylisticSetParams.
      if (buffer) {
        this.extractSSNamesFromBuffer(buffer, font);
      }

    } catch (error) {
      console.error('Error extracting OpenType features:', error);
    }

    this.availableFeatures = features;
    return features;
  }

  getNameFromFont(font, nameId) {
    const platforms = ['windows', 'macintosh', 'unicode'];
    const languageCodes = ['en', 'en-US', 'en-GB', 'und', '0'];

    for (const platform of platforms) {
      const entry = font.names && font.names[platform] && font.names[platform][nameId];
      if (entry) {
        for (const code of languageCodes) {
          if (entry[code]) return entry[code];
        }
        const keys = Object.keys(entry);
        if (keys.length > 0) return entry[keys[0]];
      }
    }
    return null;
  }

  extractSSNamesFromBuffer(buffer, font) {
    try {
      const data = new DataView(buffer);

      // Detect TTC vs single font
      const tag = String.fromCharCode(
        data.getUint8(0), data.getUint8(1), data.getUint8(2), data.getUint8(3)
      );
      const sfntOffset = (tag === 'ttcf') ? data.getUint32(12) : 0;

      // Walk sfnt table directory to find GSUB
      const numTables = data.getUint16(sfntOffset + 4);
      let gsubOffset = -1;
      for (let i = 0; i < numTables; i++) {
        const rec = sfntOffset + 12 + i * 16;
        const tableTag = String.fromCharCode(
          data.getUint8(rec), data.getUint8(rec + 1),
          data.getUint8(rec + 2), data.getUint8(rec + 3)
        );
        if (tableTag === 'GSUB') {
          gsubOffset = data.getUint32(rec + 8);
          break;
        }
      }
      if (gsubOffset < 0) return;

      // GSUB header: MajorVersion(2) MinorVersion(2) ScriptListOffset(2) FeatureListOffset(2) ...
      const featureListOffset = data.getUint16(gsubOffset + 6);
      const featureListAbs = gsubOffset + featureListOffset;

      const featureCount = data.getUint16(featureListAbs);

      for (let i = 0; i < featureCount; i++) {
        // FeatureRecord: Tag(4) + FeatureOffset(2), relative to FeatureList start
        const recAbs = featureListAbs + 2 + i * 6;
        const featureTag = String.fromCharCode(
          data.getUint8(recAbs), data.getUint8(recAbs + 1),
          data.getUint8(recAbs + 2), data.getUint8(recAbs + 3)
        );

        if (!featureTag.startsWith('ss') || this.featureNames.has(featureTag)) continue;

        const featureOffset = data.getUint16(recAbs + 4);
        const featureAbs = featureListAbs + featureOffset;

        // Feature table: FeatureParamsOffset(2) relative to this Feature table (0 = none)
        const featureParamsOffset = data.getUint16(featureAbs);
        if (featureParamsOffset === 0) continue;

        // StylisticSetParams: Version(2) + UINameID(2)
        const ssParamsAbs = featureAbs + featureParamsOffset;
        const uiNameID = data.getUint16(ssParamsAbs + 2);
        if (uiNameID === 0) continue;

        const name = this.getNameFromFont(font, uiNameID);
        if (name) {
          this.featureNames.set(featureTag, name);
        }
      }
    } catch (e) {
      console.error('Error parsing GSUB featureParams from buffer:', e);
    }
  }

  processFeatures(features, featureSet) {
    if (Array.isArray(features)) {
      features.forEach(feature => {
        if (typeof feature === 'string') {
          if (feature === 'smcp' || feature.startsWith('ss')) {
            featureSet.add(feature);
          }
        } else if (feature.tag) {
          if (feature.tag === 'smcp' || feature.tag.startsWith('ss')) {
            featureSet.add(feature.tag);
          }
        }
      });
    } else if (typeof features === 'object') {
      Object.keys(features).forEach(feature => {
        if (feature === 'smcp' || feature.startsWith('ss')) {
          featureSet.add(feature);
        }
      });
    }
  }

  processGsubTable(gsub, featureSet) {
    if (gsub.features) {
      this.processFeatures(gsub.features, featureSet);
    }

    if (gsub.lookups) {
      gsub.lookups.forEach(lookup => {
        if (lookup.features) {
          this.processFeatures(lookup.features, featureSet);
        }
      });
    }
  }

  createButtons() {
    if (!this.buttonsContainer) return;

    const existingButtons = this.buttonsContainer.querySelectorAll('.feature-button');
    existingButtons.forEach(button => button.remove());

    const wrapper = this.buttonsContainer.querySelector('.feature-buttons-wrapper') || this.buttonsContainer;

    this.availableFeatures.forEach(feature => {
      const button = document.createElement('button');
      button.className = 'feature-button';
      this.updateButtonText(button, feature);

      button.addEventListener('click', () => {
        this.toggleFeature(feature, button);
      });

      wrapper.appendChild(button);
    });
  }

  updateButtonText(button, feature) {
    const isEnabled = this.activeFeatures.has(feature);
    const displayTag = feature.toUpperCase();
    const descriptiveName = this.featureNames.get(feature);
    const label = descriptiveName ? `${displayTag} ${descriptiveName}` : displayTag;
    button.textContent = isEnabled ? `Disable ${label}` : `Enable ${label}`;
  }

  toggleFeature(feature, button) {
    if (this.activeFeatures.has(feature)) {
      this.activeFeatures.delete(feature);
    } else {
      this.activeFeatures.add(feature);
    }

    this.updateButtonText(button, feature);
    const featureString = this.getFeatureString();

    // Call the callback with the new feature string
    if (this.onFeaturesChanged) {
      this.onFeaturesChanged(featureString);
    }

    return featureString;
  }

  getFeatureString() {
    if (this.activeFeatures.size === 0) {
      return 'normal';
    }
    return Array.from(this.activeFeatures)
      .map(feature => `"${feature}" 1`)
      .join(', ');
  }

  clear() {
    this.activeFeatures.clear();
    this.availableFeatures.clear();
    this.featureNames.clear();
  }
}

export { OpenTypeFeatures };
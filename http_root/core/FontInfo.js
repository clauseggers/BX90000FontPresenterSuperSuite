// =============================================================================
// core/FontInfo.js
// =============================================================================

import { AXIS_NAMES } from './Types.js';

export class FontInfoRenderer {
  /**
   * Renders font information into a specified container
   * @param {HTMLElement} container - Container element to render into
   * @param {Object} info - Font information object
   */
  static renderFontInfo(container, info) {
    if (!container || !info) return;

    container.innerHTML = `
        <p><strong>Names</strong><br>
        Font family &rarr; ${info.fontFamily}<br>
        Font style &rarr; ${info.fontStyle}<br>

        <p><strong>Font file</strong><br>
        Filename &rarr; ${info.filename}<br>
        File format &rarr; ${info.format}<br>
        Variable font &rarr; ${info.axes.length > 0 ? 'Yes' : 'No'}<br>
        Monospaced &rarr; ${info.isFixedPitch}<br>
        Units per Em &rarr; ${info.unitsPerEm}<br>
        Glyph count &rarr; ${info.glyphCount}</p>

        ${info.axes.length ? `
        <p><strong>Variable font axes</strong><br>
        ${info.axes.map(axis =>
            `${axis.name} (${axis.tag}) &rarr; ${axis.min} to ${axis.max}, default &rarr; ${axis.default}`
            ).join('<br>')}</p>` : ''}

        <p><strong>Version and dates</strong><br>
        Version &rarr; ${info.version}<br>
        Created &rarr; ${info.created}<br>
        Modified &rarr; ${info.modified}</p>

        <p><strong>Foundry</strong><br>
        Manufacturer &rarr; ${info.manufacturer}<br>
        ${info.manufacturerURL !== 'Unknown' ? `Manufacturer URL &rarr; ${info.manufacturerURL}<br>` : ''}
        Designer &rarr; ${info.designer}<br>
        ${info.designerURL !== 'Unknown' ? `Designer URL &rarr; ${info.designerURL}<br>` : ''}
        Vendor ID &rarr; ${info.vendorID}</p>

        <p><strong>Copyright</strong><br>
        ${info.copyright}</p>

        <p><strong>License</strong><br>
        ${info.license}<br>
        ${info.licenseURL !== 'Unknown' ? `License URL &rarr; ${info.licenseURL}</p>` : '</p>'}
    `;
  }

  /**
   * Renders glyph information into a specified container
   * @param {HTMLElement} container - Container element to render into
   * @param {Object} font - OpenType.js font object
   * @param {string} glyph - Current glyph character
   */
  static renderGlyphInfo(container, font, glyph) {
    if (!container) return;

    if (!font || !glyph) {
      container.innerHTML = '<p>No glyph selected</p>';
      return;
    }

    const glyphIndex = font.charToGlyphIndex(glyph);
    const glyphObj = font.glyphs.get(glyphIndex);

    container.innerHTML = `
    <div class="glyph-info-container">
      <div class="info-column">
        <p><strong>Glyph information</strong><br>
        Character &rarr; ${glyph}<br>
        Name &rarr; <span class="monospaced">${glyphObj.name}</span><br>
        Unicode &rarr; <span class="monospaced">U+${glyphObj.unicode?.toString(16).toUpperCase().padStart(4, '0') || 'N/A'}</span><br>
        Index &rarr; <span class="monospaced">${glyphIndex}</span><br>
        Advance Width &rarr; <span class="monospaced">${glyphObj.advanceWidth}</span></p>
      </div>

      ${glyphObj.xMin !== undefined ? `
      <div class="info-column">
        <p><strong>Bounds</strong><br>
        xMin &rarr; <span class="monospaced">${glyphObj.xMin}</span><br>
        xMax &rarr; <span class="monospaced">${glyphObj.xMax}</span><br>
        yMin &rarr; <span class="monospaced">${glyphObj.yMin}</span><br>
        yMax &rarr; <span class="monospaced">${glyphObj.yMax}</span></p>
      </div>
      ` : ''}
    </div>
  `;
  }
}

/**
 * Extracts comprehensive information about a font
 * @param {Object} font - OpenType.js font object
 * @param {string} filename - Original font filename
 * @returns {Object} Detailed font information
 */
export function getFontInformation(font, filename) {
  const names = font.names;
  const os2 = font.tables.os2;
  const head = font.tables.head;
  const fvar = font.tables.fvar;

  console.log('Font tables available:', {
    hasNames: !!names,
    hasOS2: !!os2,
    hasHead: !!head,
    hasFvar: !!fvar,
    fvarAxes: fvar?.axes
  });

  // Debug font names structure
  console.log('Font names structure:', names);
  console.log('Available name properties:', Object.keys(names || {}));

  // Check what the actual property is
  const nameKeys = Object.keys(names || {});
  if (nameKeys.length > 0) {
    console.log(`First property name: "${nameKeys[0]}", value:`, names[nameKeys[0]]);

    // If it's the windows platform, let's see what's inside
    if (nameKeys[0] === 'windows' && names.windows) {
      console.log('Windows platform name IDs:', Object.keys(names.windows));
      console.log('Full windows names object:', names.windows);
    }
  }

  // Debug specific name access
  console.log('names.fontFamily:', names.fontFamily);
  console.log('names.fullName:', names.fullName);
  console.log('names.version:', names.version);
  console.log('names.copyright:', names.copyright);
  console.log('names.manufacturer:', names.manufacturer);
  console.log('names.designer:', names.designer);  const info = {
    // Basic info - using preferredFamily (Name ID 16) if available, fallback to fontFamily (Name ID 1)
    filename,
    fontFamily: extractFontName(names.windows?.preferredFamily) !== 'Unknown' ? extractFontName(names.windows?.preferredFamily) : extractFontName(names.windows?.fontFamily),
    fullName: extractFontName(names.windows?.fullName),          // Name ID 4: Full font name
    version: extractFontName(names.windows?.version),           // Name ID 5: Version string

    // Author info
    copyright: extractFontName(names.windows?.copyright),
    manufacturer: extractFontName(names.windows?.manufacturer),
    manufacturerURL: extractFontName(names.windows?.manufacturerURL),
    designer: extractFontName(names.windows?.designer),
    designerURL: extractFontName(names.windows?.designerURL),
    license: extractFontName(names.windows?.license),
    licenseURL: extractFontName(names.windows?.licenseURL),
    vendorID: os2?.achVendID || 'Unknown',

    // Technical details
    format: font.outlinesFormat,
    unitsPerEm: head?.unitsPerEm || 'Unknown',
    created: head?.created ? new Date(head.created * 1000).toLocaleDateString() : 'Unknown',
    modified: head?.modified ? new Date(head.modified * 1000).toLocaleDateString() : 'Unknown',
    glyphCount: font.glyphs.length,

    // Features
    isFixedPitch: font.tables.post?.isFixedPitch ? 'Yes' : 'No',
    fontStyle: extractFontStyle(font),
    features: extractOpenTypeFeatures(font),

    // Variable font axes
    axes: extractVariableAxes(font)
  };

// Before returning the info object
console.log('Full font axes information:', {
  rawFvar: font.tables.fvar,
  extractedAxes: extractVariableAxes(font),
});

return info;
}

// Helper functions
/**
 * Extracts a name from the OpenType names table using proper name ID structure
 * @param {Object} names - The font.names object
 * @param {number} nameId - OpenType name ID (1=family, 4=full name, 5=version, etc.)
 * @returns {string} The extracted name or 'Unknown'
 */
function extractNameByID(names, nameId) {
  if (!names) return 'Unknown';

  // Try different platforms in order of preference
  const platforms = ['windows', 'macintosh', 'unicode'];

  for (const platform of platforms) {
    if (names[platform] && names[platform][nameId]) {
      const nameEntry = names[platform][nameId];

      // Try different language codes
      const languageCodes = ['en', 'en-US', 'en-GB', 'und', '0', '1033']; // 1033 is Windows English

      for (const code of languageCodes) {
        if (nameEntry[code]) {
          return nameEntry[code];
        }
      }

      // If no language code matches, get the first available value
      const availableKeys = Object.keys(nameEntry);
      if (availableKeys.length > 0) {
        return nameEntry[availableKeys[0]];
      }
    }
  }

  return 'Unknown';
}

/**
 * Safely extracts a name value from font names table
 * Tries multiple language codes and falls back to the first available value
 * @param {Object} nameEntry - Name entry from font.names
 * @returns {string} The extracted name or 'Unknown'
 */
function extractFontName(nameEntry) {
  console.log('extractFontName called with:', nameEntry);

  if (!nameEntry) {
    console.log('nameEntry is null/undefined, returning Unknown');
    return 'Unknown';
  }

  // Try common language codes in order of preference
  const languageCodes = ['en', 'en-US', 'en-GB', 'und', '0']; // 'und' = undefined language, '0' = language ID 0

  for (const code of languageCodes) {
    if (nameEntry[code]) {
      console.log(`Found name for language code '${code}':`, nameEntry[code]);
      return nameEntry[code];
    }
  }

  // If no standard language codes work, get the first available value
  const availableKeys = Object.keys(nameEntry);
  console.log('Available keys in nameEntry:', availableKeys);

  if (availableKeys.length > 0) {
    const firstKey = availableKeys[0];
    const firstValue = nameEntry[firstKey];
    console.log(`Using first available key '${firstKey}':`, firstValue);
    return firstValue;
  }

  console.log('No keys found, returning Unknown');
  return 'Unknown';
}

/**
 * Extracts font style (upright/italic/oblique) from OpenType tables
 * @param {Object} font - OpenType.js font object
 * @returns {string} Font style: 'Upright', 'Italic', or 'Oblique'
 */
function extractFontStyle(font) {
  // Check OS/2 table fsSelection field first (most reliable)
  if (font.tables.os2 && font.tables.os2.fsSelection !== undefined) {
    const fsSelection = font.tables.os2.fsSelection;

    // Bit 9 (512): Oblique/Slanted
    if (fsSelection & 512) {
      return 'Oblique';
    }

    // Bit 0 (1): Italic
    if (fsSelection & 1) {
      return 'Italic';
    }
  }

  // Fallback to head table macStyle field
  if (font.tables.head && font.tables.head.macStyle !== undefined) {
    const macStyle = font.tables.head.macStyle;

    // Bit 1 (2): Italic
    if (macStyle & 2) {
      return 'Italic';
    }
  }

  // If no italic/oblique flags are set, it's upright/roman
  return 'Upright';
}

function extractOpenTypeFeatures(font) {
  const features = [];
  if (font.tables.gsub) {
    font.tables.gsub.features.forEach(feature => {
      features.push({
        tag: feature.tag,
        scripts: feature.feature.lookupListIndexes
      });
    });
  }
  return features;
}

function extractVariableAxes(font) {
  if (!font.tables.fvar) {
    console.log('No fvar table found in font');
    return [];
  }

  console.log('Raw fvar axes:', font.tables.fvar.axes);

  const axes = font.tables.fvar.axes.map(axis => {
    const mappedAxis = {
      tag: axis.tag,
      name: AXIS_NAMES[axis.tag] || axis.tag,
      min: axis.minValue,
      max: axis.maxValue,
      default: axis.defaultValue
    };
    console.log('Mapped axis:', mappedAxis);
    return mappedAxis;
  });

  console.log('Final extracted axes:', axes);
  return axes;
}
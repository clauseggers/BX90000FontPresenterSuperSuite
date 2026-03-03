// =============================================================================
// core/FontInfo.ts
// =============================================================================
import { AXIS_NAMES } from './Types.js';
// ---------------------------------------------------------------------------
// FontInfoRenderer — static helpers that inject HTML into DOM containers
// ---------------------------------------------------------------------------
export class FontInfoRenderer {
    /**
     * Renders font information into a container element.
     */
    static renderFontInfo(container, info) {
        if (!container || !info)
            return;
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
        ${info.axes.map(axis => `${axis.name} (${axis.tag}) &rarr; ${axis.min} to ${axis.max}, default &rarr; ${axis.default}`).join('<br>')}</p>` : ''}

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

        <p><strong>Licence</strong><br>
        ${info.license}<br>
        ${info.licenseURL !== 'Unknown' ? `Licence URL &rarr; ${info.licenseURL}</p>` : '</p>'}
    `;
    }
    /**
     * Renders glyph information into a container element.
     */
    static renderGlyphInfo(container, font, glyph) {
        if (!container)
            return;
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
        Unicode &rarr; <span class="monospaced">U+${glyphObj.unicode?.toString(16).toUpperCase().padStart(4, '0') ?? 'N/A'}</span><br>
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
// ---------------------------------------------------------------------------
// getFontInformation — main extraction function
// ---------------------------------------------------------------------------
/**
 * Extracts comprehensive information about a font file.
 */
export function getFontInformation(font, filename) {
    const names = font.names;
    const os2 = font.tables.os2;
    const head = font.tables.head;
    console.log('Font tables available:', {
        hasNames: !!names,
        hasOS2: !!os2,
        hasHead: !!head,
        hasFvar: !!font.tables.fvar,
        fvarAxes: font.tables.fvar?.axes,
    });
    console.log('Font names structure:', names);
    const info = {
        filename,
        // Name ID 16 (preferredFamily) takes precedence over Name ID 1 (fontFamily)
        fontFamily: (() => {
            const preferred = extractFontName(names.windows?.preferredFamily);
            return preferred !== 'Unknown' ? preferred : extractFontName(names.windows?.fontFamily);
        })(),
        fullName: extractFontName(names.windows?.fullName),
        version: extractFontName(names.windows?.version),
        copyright: extractFontName(names.windows?.copyright),
        manufacturer: extractFontName(names.windows?.manufacturer),
        manufacturerURL: extractFontName(names.windows?.manufacturerURL),
        designer: extractFontName(names.windows?.designer),
        designerURL: extractFontName(names.windows?.designerURL),
        license: extractFontName(names.windows?.license),
        licenseURL: extractFontName(names.windows?.licenseURL),
        vendorID: os2?.achVendID ?? 'Unknown',
        format: font.outlinesFormat,
        unitsPerEm: head?.unitsPerEm ?? 'Unknown',
        created: head?.created ? new Date(head.created * 1000).toLocaleDateString() : 'Unknown',
        modified: head?.modified ? new Date(head.modified * 1000).toLocaleDateString() : 'Unknown',
        glyphCount: font.glyphs.length,
        isFixedPitch: font.tables.post?.isFixedPitch ? 'Yes' : 'No',
        fontStyle: extractFontStyle(font),
        features: extractOpenTypeFeatures(font),
        axes: extractVariableAxes(font),
        instances: extractVariableInstances(font),
    };
    console.log('Full font axes information:', {
        rawFvar: font.tables.fvar,
        extractedAxes: info.axes,
    });
    return info;
}
// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------
/**
 * Safely extracts a localised string from a font name entry.
 * Tries common language codes, then falls through to the first available value.
 */
function extractFontName(nameEntry) {
    if (!nameEntry)
        return 'Unknown';
    const languageCodes = ['en', 'en-US', 'en-GB', 'und', '0'];
    for (const code of languageCodes) {
        const val = nameEntry[code];
        if (val)
            return val;
    }
    const keys = Object.keys(nameEntry);
    if (keys.length > 0) {
        const firstVal = nameEntry[keys[0]];
        if (firstVal !== undefined)
            return firstVal;
    }
    return 'Unknown';
}
/**
 * Determines the upright/italic/oblique style from OS/2 and head tables.
 */
function extractFontStyle(font) {
    const os2 = font.tables.os2;
    if (os2?.fsSelection !== undefined) {
        // Bit 9 (512): Oblique
        if (os2.fsSelection & 512)
            return 'Oblique';
        // Bit 0 (1): Italic
        if (os2.fsSelection & 1)
            return 'Italic';
    }
    const head = font.tables.head;
    if (head?.macStyle !== undefined) {
        // Bit 1 (2): Italic
        if (head.macStyle & 2)
            return 'Italic';
    }
    return 'Upright';
}
function extractOpenTypeFeatures(font) {
    const features = [];
    const gsub = font.tables.gsub;
    if (gsub) {
        for (const feature of gsub.features) {
            features.push({
                tag: feature.tag,
                scripts: feature.feature.lookupListIndexes,
            });
        }
    }
    return features;
}
function extractVariableInstances(font) {
    const fvar = font.tables.fvar;
    if (!fvar?.instances)
        return [];
    return fvar.instances
        .filter(inst => inst.name != null)
        .map(inst => {
        let name = inst.name;
        if (typeof name === 'object' && name !== null) {
            const langCodes = ['en', 'en-US', 'en-GB', 'und'];
            let found = null;
            for (const code of langCodes) {
                const val = name[code];
                if (val) {
                    found = val;
                    break;
                }
            }
            if (found === null) {
                const keys = Object.keys(name);
                const firstKey = keys[0];
                found = firstKey !== undefined ? name[firstKey] ?? null : null;
            }
            name = found;
        }
        if (!name)
            return null;
        return { name: name, coordinates: inst.coordinates };
    })
        .filter((inst) => inst !== null);
}
function extractVariableAxes(font) {
    const fvar = font.tables.fvar;
    if (!fvar)
        return [];
    return fvar.axes.map(axis => ({
        tag: axis.tag,
        name: AXIS_NAMES[axis.tag] ?? axis.tag,
        min: axis.minValue,
        max: axis.maxValue,
        default: axis.defaultValue,
    }));
}
//# sourceMappingURL=FontInfo.js.map
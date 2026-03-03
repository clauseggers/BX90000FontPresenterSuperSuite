// =============================================================================
// shared/MetricsOverlay.ts
// =============================================================================
export class MetricsOverlay {
    overlay;
    isVisible = false;
    constructor(overlayElement = null) {
        // Fallback to a detached div when no element is supplied (WordMaster usage)
        this.overlay = overlayElement ?? document.createElement('div');
    }
    render(font, glyphElement) {
        if (!this.isVisible || !glyphElement || !font)
            return;
        this.overlay.innerHTML = '';
        const currentChar = glyphElement.textContent;
        if (!currentChar)
            return;
        const metrics = this.calculateMetrics(font, glyphElement, currentChar);
        this.renderMetricLines(metrics, font);
        this.renderBearingLines(metrics);
    }
    calculateMetrics(font, glyphElement, currentChar) {
        const computedStyle = getComputedStyle(glyphElement);
        const fontSize = parseInt(computedStyle.fontSize, 10);
        const unitsPerEm = font.unitsPerEm;
        const metricsScale = fontSize / unitsPerEm;
        const glyphRect = glyphElement.getBoundingClientRect();
        const renderedWidth = glyphRect.width;
        const verticalCenter = glyphRect.top + glyphRect.height / 2;
        const horizontalCenter = glyphRect.left + glyphRect.width / 2;
        const glyphIndex = font.charToGlyphIndex(currentChar);
        const glyph = font.glyphs.get(glyphIndex);
        const os2 = font.tables.os2;
        if (!os2) {
            // Return a minimal metrics object when OS/2 table is absent
            return {
                glyph: null, fontSize, metricsScale, glyphRect,
                containerCenter: horizontalCenter, baseline: verticalCenter,
                renderedWidth, ascender: verticalCenter, descender: verticalCenter,
                capHeight: verticalCenter, xHeight: verticalCenter,
                originalMetrics: { ascender: 0, descender: 0, capHeight: 0, xHeight: 0 },
            };
        }
        const totalHeight = os2.sTypoAscender - os2.sTypoDescender;
        const baselineRatio = os2.sTypoAscender / totalHeight;
        const totalPixelHeight = (totalHeight / unitsPerEm) * fontSize;
        const baseline = verticalCenter - (totalPixelHeight / 2) + (baselineRatio * totalPixelHeight);
        return {
            glyph,
            fontSize,
            metricsScale,
            glyphRect,
            containerCenter: horizontalCenter,
            baseline,
            renderedWidth,
            ascender: baseline - os2.sTypoAscender * metricsScale,
            descender: baseline - os2.sTypoDescender * metricsScale,
            capHeight: baseline - os2.sCapHeight * metricsScale,
            xHeight: baseline - os2.sxHeight * metricsScale,
            originalMetrics: {
                ascender: os2.sTypoAscender,
                descender: os2.sTypoDescender,
                capHeight: os2.sCapHeight,
                xHeight: os2.sxHeight,
                smallCapHeight: os2.sSmallCapHeight,
            },
        };
    }
    renderMetricLines(metrics, font) {
        const lines = [
            { pos: metrics.baseline, label: 'Baseline', value: 0 },
            { pos: metrics.ascender, label: 'Ascender', value: metrics.originalMetrics.ascender },
            { pos: metrics.descender, label: 'Descender', value: metrics.originalMetrics.descender },
            { pos: metrics.capHeight, label: 'Capital height', value: metrics.originalMetrics.capHeight },
            { pos: metrics.xHeight, label: 'x-height', value: metrics.originalMetrics.xHeight },
        ];
        const os2 = font.tables.os2;
        if (os2?.sSmallCapHeight) {
            lines.push({
                pos: metrics.baseline - os2.sSmallCapHeight * metrics.metricsScale,
                label: 'Small Caps',
                value: os2.sSmallCapHeight,
            });
        }
        for (const { pos, label, value } of lines) {
            if (!isFinite(pos))
                continue;
            const line = document.createElement('div');
            line.className = 'metric-line';
            line.style.top = `${pos}px`;
            const legend = document.createElement('div');
            legend.className = 'legend';
            legend.style.top = `${pos - 21}px`;
            const labelText = document.createTextNode(`${label} → `);
            const valueSpan = document.createElement('span');
            valueSpan.className = 'monospaced';
            valueSpan.textContent = String(value);
            legend.appendChild(labelText);
            legend.appendChild(valueSpan);
            this.overlay.appendChild(line);
            this.overlay.appendChild(legend);
        }
    }
    renderBearingLines(metrics) {
        if (!metrics.glyph)
            return;
        const leftPos = metrics.containerCenter - metrics.renderedWidth / 2;
        const rightPos = leftPos + metrics.renderedWidth;
        for (const pos of [leftPos, rightPos]) {
            if (!isFinite(pos))
                continue;
            const line = document.createElement('div');
            line.className = 'side-bearing-line';
            line.style.left = `${pos}px`;
            this.overlay.appendChild(line);
        }
    }
    toggle() {
        this.isVisible = !this.isVisible;
        this.overlay.style.display = this.isVisible ? 'block' : 'none';
    }
}
//# sourceMappingURL=MetricsOverlay.js.map
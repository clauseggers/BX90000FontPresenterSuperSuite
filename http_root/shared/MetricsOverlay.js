// =============================================================================
// shared/MetricsOverlay.js
// =============================================================================

export class MetricsOverlay {
  constructor(overlayElement) {
    this.overlay = overlayElement;
    this.isVisible = false;
  }

  render(font, glyphElement) {
    if (!this.isVisible || !glyphElement) return;

    this.overlay.innerHTML = '';

    const currentChar = glyphElement.textContent;
    if (!currentChar) return;

    const metrics = this.calculateMetrics(font, glyphElement, currentChar);
    this.renderMetricLines(metrics, font);
    this.renderBearingLines(metrics);
  }

  calculateMetrics(font, glyphElement, currentChar) {
    const computedStyle = getComputedStyle(glyphElement);
    const fontSize = parseInt(computedStyle.fontSize);
    const unitsPerEm = font.unitsPerEm;

    // Basic metrics scale based on font size
    const metricsScale = fontSize / unitsPerEm;

    // Get the glyph element's metrics
    const glyphRect = glyphElement.getBoundingClientRect();
    const renderedWidth = glyphRect.width;
    const verticalCenter = glyphRect.top + (glyphRect.height / 2);
    const horizontalCenter = glyphRect.left + (glyphRect.width / 2);

    // Get glyph info
    const glyphIndex = font.charToGlyphIndex(currentChar);
    const glyph = font.glyphs.get(glyphIndex);

    // The total height in font units from descender to ascender
    const totalHeight = font.tables.os2.sTypoAscender - font.tables.os2.sTypoDescender;

    // Calculate how much of the total height is above the baseline (in font units)
    const baselineOffset = font.tables.os2.sTypoAscender;

    // Calculate where the baseline should be relative to the center
    const baselineRatio = baselineOffset / totalHeight;

    // Scale the total height to pixels
    const totalPixelHeight = (totalHeight / unitsPerEm) * fontSize;

    // Position the baseline
    const baseline = verticalCenter - (totalPixelHeight / 2) + (baselineRatio * totalPixelHeight);

    return {
      glyph,
      fontSize,
      metricsScale,
      glyphRect,
      containerCenter: horizontalCenter,
      baseline,
      renderedWidth,
      ascender: baseline - (font.tables.os2.sTypoAscender * metricsScale),
      descender: baseline - (font.tables.os2.sTypoDescender * metricsScale),
      capHeight: baseline - (font.tables.os2.sCapHeight * metricsScale),
      xHeight: baseline - (font.tables.os2.sxHeight * metricsScale),
      // Store the original values from the font file
      originalMetrics: {
        ascender: font.tables.os2.sTypoAscender,
        descender: font.tables.os2.sTypoDescender,
        capHeight: font.tables.os2.sCapHeight,
        xHeight: font.tables.os2.sxHeight,
        smallCapHeight: font.tables.os2.sSmallCapHeight
      }
    };
  }

  renderMetricLines(metrics, font) {
    const lines = [
      {
        pos: metrics.baseline,
        label: 'Baseline',
        value: 0 // Baseline is reference point 0
      },
      {
        pos: metrics.ascender,
        label: 'Ascender',
        value: metrics.originalMetrics.ascender
      },
      {
        pos: metrics.descender,
        label: 'Descender',
        value: metrics.originalMetrics.descender
      },
      {
        pos: metrics.capHeight,
        label: 'Capital height',
        value: metrics.originalMetrics.capHeight
      },
      {
        pos: metrics.xHeight,
        label: 'x-height',
        value: metrics.originalMetrics.xHeight
      }
    ];

    if (font.tables.os2.sSmallCapHeight) {
      lines.push({
        pos: metrics.baseline - (font.tables.os2.sSmallCapHeight * metrics.metricsScale),
        label: 'Small Caps',
        value: metrics.originalMetrics.smallCapHeight
      });
    }

    lines.forEach(({ pos, label, value }) => {
      if (isFinite(pos)) {
        const line = document.createElement('div');
        line.className = 'metric-line';
        line.style.top = `${pos}px`;

        const legend = document.createElement('div');
        legend.className = 'legend';
        legend.style.top = `${pos - 21}px`;

        // Create the formatted legend content
        const labelText = document.createTextNode(`${label} → `);
        const valueSpan = document.createElement('span');
        valueSpan.className = 'monospaced';
        valueSpan.textContent = `${value}`;

        legend.appendChild(labelText);
        legend.appendChild(valueSpan);

        this.overlay.appendChild(line);
        this.overlay.appendChild(legend);
      }
    });
  }

  renderBearingLines(metrics) {
    if (!metrics.glyph) return;

    // Use the rendered width for sidebearings, which takes into account both
    // font size and any active variation settings
    const leftPos = metrics.containerCenter - (metrics.renderedWidth / 2);
    const rightPos = leftPos + metrics.renderedWidth;

    [leftPos, rightPos].forEach(pos => {
      if (isFinite(pos)) {
        const line = document.createElement('div');
        line.className = 'side-bearing-line';
        line.style.left = `${pos}px`;
        this.overlay.appendChild(line);
      }
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.overlay.style.display = this.isVisible ? 'block' : 'none';
  }
}

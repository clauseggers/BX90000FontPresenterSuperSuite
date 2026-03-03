/**
 * GlyphGrid.ts
 * Manages the grid of glyph cells for TurboTiler BX90000 Fascination
 */
// ---------------------------------------------------------------------------
export class GlyphGrid {
    cells = [];
    glyphList = [];
    axes = [];
    features = [];
    fontFamily = '';
    gridCols = 0;
    gridRows = 0;
    container = null;
    zoomOutScale = 1;
    containerWidth = 0;
    containerHeight = 0;
    axisSamplers = [];
    namedInstances = [];
    cellAspectRatio = 1;
    viewportWidth = 0;
    viewportHeight = 0;
    font = null;
    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
    populate(container, glyphList, axes, features, fontFamily, font, zoomOutScale = 1) {
        // AxisDefinition uses .min / .max / .default (not minValue/maxValue/defaultValue)
        this.glyphList = glyphList;
        this.axes = axes;
        this.features = features;
        this.fontFamily = fontFamily;
        this.font = font;
        this.container = container;
        this.zoomOutScale = zoomOutScale;
        this.axisSamplers = this.createAxisSamplers();
        this.namedInstances = this.extractNamedInstances(font);
        if (this.namedInstances.length > 0) {
            console.log(`Found ${this.namedInstances.length} named instances in font`);
        }
        this.cellAspectRatio = this.calculateFontAspectRatio(font);
        container.innerHTML = '';
        this.cells = [];
        this.viewportWidth = container.parentElement?.clientWidth ?? window.innerWidth;
        this.viewportHeight = container.parentElement?.clientHeight ?? window.innerHeight;
        const cellWidthFactor = 0.5;
        const cellHeightFactor = 0.6;
        const minCoverageFactor = 1.06;
        const overscanCells = 1;
        const minGridCols = 13;
        const minGridRows = 13;
        const requiredCols = Math.ceil(minCoverageFactor / (this.zoomOutScale * cellWidthFactor));
        const requiredRows = Math.ceil(minCoverageFactor / (this.zoomOutScale * cellHeightFactor));
        this.gridCols = Math.max(minGridCols, requiredCols + overscanCells);
        this.gridRows = Math.max(minGridRows, requiredRows + overscanCells);
        if (this.gridCols % 2 === 0)
            this.gridCols += 1;
        if (this.gridRows % 2 === 0)
            this.gridRows += 1;
        const cellWidth = this.viewportWidth * cellWidthFactor;
        const cellHeight = this.viewportHeight * cellHeightFactor;
        this.containerWidth = this.gridCols * cellWidth;
        this.containerHeight = this.gridRows * cellHeight;
        container.style.width = `${this.containerWidth}px`;
        container.style.height = `${this.containerHeight}px`;
        container.style.gridTemplateColumns = `repeat(${this.gridCols}, ${cellWidth}px)`;
        container.style.gridTemplateRows = `repeat(${this.gridRows}, ${cellHeight}px)`;
        const cellCount = this.gridCols * this.gridRows;
        for (let i = 0; i < cellCount; i++) {
            const cell = this.createCell();
            container.appendChild(cell);
            this.cells.push(cell);
            this.updateCell(cell);
        }
        console.log(`Created ${cellCount} grid cells (${this.gridCols} × ${this.gridRows})`);
        console.log(`Font aspect ratio (width:height): ${this.cellAspectRatio.toFixed(3)}`);
        const nonLinearTags = this.axisSamplers
            .filter(s => s.hasNonLinearAvar)
            .map(s => s.tag);
        if (nonLinearTags.length > 0) {
            console.log('Detected non-linear avar axes:', nonLinearTags);
        }
    }
    randomiseAll() {
        this.cells.forEach(cell => this.updateCell(cell));
    }
    getCellCount() {
        return this.cells.length;
    }
    getCellInfoByIndex(index) {
        if (this.cells.length === 0 || !this.container)
            return null;
        const cell = this.cells[index];
        if (!cell)
            return null;
        const row = Math.floor(index / this.gridCols);
        const col = index % this.gridCols;
        const vpW = this.viewportWidth || this.container.parentElement?.clientWidth || window.innerWidth;
        const vpH = this.viewportHeight || this.container.parentElement?.clientHeight || window.innerHeight;
        const cW = this.containerWidth || (vpW / this.zoomOutScale);
        const cH = this.containerHeight || (vpH / this.zoomOutScale);
        const containerLeft = (vpW - cW) / 2;
        const containerTop = (vpH - cH) / 2;
        const computed = window.getComputedStyle(this.container);
        const gap = parseFloat(computed.columnGap || computed.gap || '0') || 0;
        const cellWidth = (cW - gap * (this.gridCols - 1)) / this.gridCols;
        const cellHeight = (cH - gap * (this.gridRows - 1)) / this.gridRows;
        const x = containerLeft + (col * (cellWidth + gap)) + cellWidth / 2;
        const y = containerTop + (row * (cellHeight + gap)) + cellHeight / 2;
        return { element: cell, index, x, y, cellWidth, cellHeight };
    }
    getRandomCell() {
        if (this.cells.length === 0 || !this.container)
            return null;
        const index = Math.floor(Math.random() * this.cells.length);
        return this.getCellInfoByIndex(index);
    }
    getCenterCell() {
        if (this.cells.length === 0 || !this.container)
            return null;
        const centerRow = Math.floor(this.gridRows / 2);
        const centerCol = Math.floor(this.gridCols / 2);
        const index = centerRow * this.gridCols + centerCol;
        return this.getCellInfoByIndex(index);
    }
    // ---------------------------------------------------------------------------
    // Cell helpers
    // ---------------------------------------------------------------------------
    createCell() {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        const content = document.createElement('div');
        content.className = 'grid-cell-content';
        cell.appendChild(content);
        return cell;
    }
    updateCell(cell) {
        const content = cell.querySelector('.grid-cell-content');
        if (!content)
            return;
        content.textContent = this.randomiseGlyph();
        content.style.fontFamily = `"${this.fontFamily}"`;
        if (this.axes.length > 0) {
            content.style.fontVariationSettings = this.randomiseAxes();
        }
        if (this.features.length > 0) {
            content.style.fontFeatureSettings = this.randomiseFeatures();
        }
    }
    // ---------------------------------------------------------------------------
    // Glyph & feature randomisation
    // ---------------------------------------------------------------------------
    randomiseGlyph() {
        if (this.glyphList.length === 0)
            return '?';
        const idx = Math.floor(Math.random() * this.glyphList.length);
        return this.glyphList[idx] ?? '?';
    }
    randomiseAxes() {
        if (this.axes.length === 0)
            return '';
        return this.namedInstances.length > 0
            ? this.randomiseAxesFromNamedInstances()
            : this.randomiseAxesNumerically();
    }
    randomiseAxesFromNamedInstances() {
        const idx = Math.floor(Math.random() * this.namedInstances.length);
        const coordinates = this.namedInstances[idx] ?? {};
        return this.axes.map(axis => {
            const value = coordinates[axis.tag] ?? axis.default;
            return `"${axis.tag}" ${value.toFixed(2)}`;
        }).join(', ');
    }
    randomiseAxesNumerically() {
        return this.axes.map(axis => {
            const value = this.sampleAxisValue(axis);
            return `"${axis.tag}" ${value.toFixed(2)}`;
        }).join(', ');
    }
    sampleAxisValue(axis) {
        if (axis.tag === 'opsz') {
            const logMin = Math.log(axis.min);
            const logMax = Math.log(axis.max);
            return Math.exp(logMin + Math.random() * (logMax - logMin));
        }
        const sampler = this.axisSamplers.find(s => s.tag === axis.tag);
        if (!sampler?.hasNonLinearAvar || sampler.avarPairs.length < 2) {
            return axis.min + Math.random() * (axis.max - axis.min);
        }
        const rawNormalized = -1 + Math.random() * 2;
        return this.normalizedToAxisValue(rawNormalized, axis);
    }
    createAxisSamplers() {
        if (!this.font?.tables?.fvar?.axes || this.axes.length === 0)
            return [];
        const axisOrder = this.font.tables.fvar.axes;
        const avarMaps = this.font.tables.avar?.axisSegmentMaps ?? [];
        const epsilon = 1e-6;
        return this.axes.map(axis => {
            const axisIndex = axisOrder.findIndex(fa => fa.tag === axis.tag);
            const segmentMap = axisIndex >= 0 ? avarMaps[axisIndex] : null;
            const pairs = (segmentMap?.axisValueMaps ?? [])
                .map((p) => ({
                fromCoordinate: p.fromCoordinate,
                toCoordinate: p.toCoordinate,
            }))
                .sort((a, b) => a.fromCoordinate - b.fromCoordinate);
            const hasNonLinearAvar = pairs.some(p => Math.abs(p.toCoordinate - p.fromCoordinate) > epsilon);
            return { tag: axis.tag, hasNonLinearAvar, avarPairs: pairs };
        });
    }
    invertAvar(pairs, targetToCoordinate) {
        if (!pairs || pairs.length < 2) {
            return Math.max(-1, Math.min(1, targetToCoordinate));
        }
        const clamped = Math.max(-1, Math.min(1, targetToCoordinate));
        for (let i = 1; i < pairs.length; i++) {
            const prev = pairs[i - 1];
            const current = pairs[i];
            const minTo = Math.min(prev.toCoordinate, current.toCoordinate);
            const maxTo = Math.max(prev.toCoordinate, current.toCoordinate);
            if (clamped < minTo || clamped > maxTo)
                continue;
            const outputDelta = current.toCoordinate - prev.toCoordinate;
            if (Math.abs(outputDelta) < 1e-9)
                return prev.fromCoordinate;
            const ratio = (clamped - prev.toCoordinate) / outputDelta;
            const fromValue = prev.fromCoordinate + ratio * (current.fromCoordinate - prev.fromCoordinate);
            return Math.max(-1, Math.min(1, fromValue));
        }
        const first = pairs[0];
        const last = pairs[pairs.length - 1];
        const nearest = Math.abs(clamped - first.toCoordinate) <= Math.abs(clamped - last.toCoordinate)
            ? first : last;
        return Math.max(-1, Math.min(1, nearest.fromCoordinate));
    }
    // Suppress unused-method warning — invertAvar is part of the algorithm
    // surface even though the immediate caller is normalizedToAxisValue.
    normalizedToAxisValue(normalizedValue, axis) {
        const clamped = Math.max(-1, Math.min(1, normalizedValue));
        if (clamped < 0) {
            return axis.default + clamped * (axis.default - axis.min);
        }
        return axis.default + clamped * (axis.max - axis.default);
    }
    randomiseFeatures() {
        if (this.features.length === 0)
            return '';
        const FEATURE_BIAS = {
            smcp: 0.1, zero: 0.2, ordn: 0.1, case: 0.2,
            sinf: 0.3, sups: 0.2, subs: 0.2,
        };
        const DEFAULT_FEATURE_PROBABILITY = 0.5;
        const randomizablePattern = /^(ss\d\d|cv\d\d|case|ordn|smcp|sinf|sups|subs|pnum|tnum|onum|lnum|zero)$/;
        const randomizable = this.features.filter(f => randomizablePattern.test(f));
        if (randomizable.length === 0)
            return 'normal';
        return randomizable.map(f => {
            const prob = FEATURE_BIAS[f] ?? DEFAULT_FEATURE_PROBABILITY;
            const enabled = Math.random() < prob ? 1 : 0;
            return `"${f}" ${enabled}`;
        }).join(', ');
    }
    // ---------------------------------------------------------------------------
    // Font metric helpers
    // ---------------------------------------------------------------------------
    calculateFontAspectRatio(font) {
        if (!font.tables.os2)
            return 1;
        const ascender = font.tables.os2.sTypoAscender ?? font.ascender;
        const descender = font.tables.os2.sTypoDescender ?? font.descender;
        const verticalSpan = ascender - descender;
        const refWidth = font.unitsPerEm ?? 1000;
        return refWidth / verticalSpan;
    }
    extractNamedInstances(font) {
        const instances = font.tables.fvar?.instances;
        if (!instances || instances.length === 0)
            return [];
        return instances
            .map(inst => inst.coordinates)
            .filter((c) => c != null);
    }
}
//# sourceMappingURL=GlyphGrid.js.map
// =============================================================================
// hyperflip/HyperFlip.ts
// =============================================================================
import { FontLoader } from '../core/FontLoader.js';
import { saveHyperFlipState, getSavedHyperFlipState } from '../shared/FontSession.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { GlyphAnimator } from './GlyphAnimator.js';
import { MetricsOverlay } from '../shared/MetricsOverlay.js';
import { VariationAxes } from '../shared/VariationAxes.js';
import { UIControls } from '../shared/UIControls.js';
import { DragAndDrop } from '../shared/DragAndDrop.js';
import { initAppNav } from '../shared/AppNav.js';
class FontViewer {
    fontLoader;
    glyphAnimator;
    metricsOverlay;
    variationAxes;
    uiControls;
    dragAndDrop;
    _resizeObserver;
    _keyHandler;
    constructor() {
        this.fontLoader = new FontLoader({
            onFontLoaded: (result) => { this.handleFontLoaded(result); },
            onError: (error) => { this.handleError(error); },
        });
        this.glyphAnimator = new GlyphAnimator({
            displayElement: document.querySelector('.glyph-buffer'),
            onGlyphChange: (glyph) => { this.handleGlyphChange(glyph); },
        });
        this.metricsOverlay = new MetricsOverlay(document.getElementById('font-metrics-overlay'));
        this.variationAxes = new VariationAxes({
            container: document.getElementById('controls'),
            onChange: (settings) => { this.handleAxesChange(settings); },
        });
        this.uiControls = new UIControls();
        this.dragAndDrop = new DragAndDrop({
            dropZone: document.body,
            onDrop: (buffer, filename) => { void this.handleFontDrop(buffer, filename); },
        });
        this._keyHandler = (e) => { this.handleKeyPress(e); };
        this._resizeObserver = new ResizeObserver(() => {
            if (this.metricsOverlay.isVisible) {
                this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
            }
        });
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.uiControls.setupSharedButtons();
        const displayContainer = document.querySelector('.display-container');
        if (displayContainer) {
            this._resizeObserver.observe(displayContainer);
        }
        // Glyph info toggle
        const glyphInfoToggle = document.getElementById('glyph-info-toggle');
        glyphInfoToggle?.addEventListener('click', () => {
            const glyphInfo = document.getElementById('glyph-info');
            if (!glyphInfo)
                return;
            const isVisible = glyphInfo.style.display !== 'none';
            glyphInfo.style.display = isVisible ? 'none' : 'block';
            glyphInfoToggle.textContent = isVisible ? 'Show glyph info' : 'Hide glyph info';
        });
        // Randomise button
        const randomiseButton = document.getElementById('randomise-button');
        randomiseButton?.addEventListener('click', () => {
            this.glyphAnimator.toggleOrder();
            randomiseButton.textContent = this.glyphAnimator.isRandomOrder
                ? 'Sequential glyph order'
                : 'Randomise glyph order';
        });
        // Metrics toggle
        const metricsToggle = document.getElementById('metrics-toggle');
        metricsToggle?.addEventListener('click', () => {
            this.metricsOverlay.toggle();
            metricsToggle.textContent = this.metricsOverlay.isVisible ? 'Hide metrics' : 'Show metrics';
        });
        document.addEventListener('keydown', this._keyHandler);
        this.setupSliderControls();
    }
    setupSliderControls() {
        const fontSizeSlider = document.getElementById('font-size');
        fontSizeSlider?.addEventListener('input', () => {
            const newSize = fontSizeSlider.value;
            this.glyphAnimator.displayElement.style.fontSize = `${newSize}px`;
            fontSizeSlider.nextElementSibling.textContent = `${newSize}px`;
            if (this.metricsOverlay.isVisible) {
                this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
            }
        });
        const speedSlider = document.getElementById('animation-delay');
        speedSlider?.addEventListener('input', () => {
            const newInterval = parseInt(speedSlider.value, 10);
            speedSlider.nextElementSibling.textContent = `${newInterval}ms`;
            if (this.glyphAnimator.isAnimating) {
                this.glyphAnimator.stop();
                this.glyphAnimator.start(newInterval);
            }
        });
        const verticalPositionSlider = document.getElementById('vertical-position');
        verticalPositionSlider?.addEventListener('input', () => {
            const reversedPosition = parseInt(verticalPositionSlider.max, 10) - parseInt(verticalPositionSlider.value, 10);
            this.glyphAnimator.displayElement.style.top = `${reversedPosition - 50}%`;
            verticalPositionSlider.nextElementSibling.textContent = `${reversedPosition}%`;
            if (this.metricsOverlay.isVisible) {
                this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
            }
        });
    }
    async handleFontDrop(buffer, filename) {
        document.getElementById('drop-text')?.remove();
        saveHyperFlipState(null);
        try {
            const result = await this.fontLoader.loadFont(buffer, filename);
            this.handleFontLoaded(result);
        }
        catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)));
        }
    }
    handleFontLoaded({ font, fontInfo, fontFamily }) {
        const display = document.querySelector('.glyph-buffer');
        if (display) {
            display.style.fontFamily = `"${fontFamily}"`;
            display.style.fontSize = '600px';
        }
        FontInfoRenderer.renderFontInfo(document.getElementById('font-info-content'), fontInfo);
        if (fontInfo.axes.length > 0) {
            this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances);
        }
        void this.glyphAnimator.setGlyphsFromFont(font).then(() => {
            this._restoreHyperFlipState(getSavedHyperFlipState());
            const delaySlider = document.getElementById('animation-delay');
            const delay = parseInt(delaySlider?.value ?? '500', 10);
            this.glyphAnimator.start(delay);
        });
    }
    handleGlyphChange(glyph) {
        FontInfoRenderer.renderGlyphInfo(document.getElementById('glyph-info-content'), this.fontLoader.currentFont, glyph);
        this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
    }
    handleError(error) {
        console.error('Font loading error:', error);
        alert(`Error loading font: ${error.message}`);
    }
    handleAxesChange(settings) {
        const displayElement = document.querySelector('.glyph-buffer');
        if (displayElement) {
            displayElement.style.fontVariationSettings = settings;
        }
        if (this.metricsOverlay.isVisible) {
            this.metricsOverlay.render(this.fontLoader.currentFont, this.glyphAnimator.displayElement);
        }
    }
    handleKeyPress(event) {
        const delaySlider = document.getElementById('animation-delay');
        const delay = parseInt(delaySlider?.value ?? '100', 10);
        switch (event.key) {
            case ' ':
                event.preventDefault();
                if (this.glyphAnimator.isAnimating) {
                    this.glyphAnimator.stop();
                }
                else {
                    this.glyphAnimator.start(delay);
                }
                break;
            case 'f':
                this.uiControls.toggleFullscreen();
                break;
            case 'ArrowLeft':
            case 'h':
                this.glyphAnimator.stop();
                this.glyphAnimator.moveBack(10);
                break;
            case 'j':
            case 'ArrowDown':
                this.glyphAnimator.stop();
                this.glyphAnimator.moveBack(1);
                break;
            case 'ArrowRight':
            case 'l':
                this.glyphAnimator.stop();
                this.glyphAnimator.moveForward(10);
                break;
            case 'k':
            case 'ArrowUp':
                this.glyphAnimator.stop();
                this.glyphAnimator.moveForward(1);
                break;
        }
    }
    _saveHyperFlipState() {
        if (!this.fontLoader.currentFont)
            return;
        const glyphInfo = document.getElementById('glyph-info');
        const fontSizeSlider = document.getElementById('font-size');
        const verticalPositionSlider = document.getElementById('vertical-position');
        const animationDelaySlider = document.getElementById('animation-delay');
        saveHyperFlipState({
            isRandomOrder: this.glyphAnimator.isRandomOrder,
            isMetricsVisible: this.metricsOverlay.isVisible,
            isGlyphInfoVisible: glyphInfo ? glyphInfo.style.display !== 'none' : false,
            glyphIndex: this.glyphAnimator.currentIndex,
            fontSize: fontSizeSlider ? parseInt(fontSizeSlider.value, 10) : null,
            verticalPosition: verticalPositionSlider ? parseInt(verticalPositionSlider.value, 10) : null,
            animationDelay: animationDelaySlider ? parseInt(animationDelaySlider.value, 10) : null,
        });
    }
    _restoreHyperFlipState(state) {
        if (!state)
            return;
        if (state.isRandomOrder) {
            this.glyphAnimator.toggleOrder();
            const btn = document.getElementById('randomise-button');
            if (btn)
                btn.textContent = 'Sequential glyph order';
        }
        if (!state.isRandomOrder && state.glyphIndex > 0) {
            this.glyphAnimator.currentIndex = Math.min(state.glyphIndex, this.glyphAnimator.glyphs.length - 1);
        }
        if (state.isMetricsVisible) {
            this.metricsOverlay.toggle();
            const btn = document.getElementById('metrics-toggle');
            if (btn)
                btn.textContent = 'Hide metrics';
        }
        if (state.isGlyphInfoVisible) {
            const glyphInfo = document.getElementById('glyph-info');
            if (glyphInfo)
                glyphInfo.style.display = 'block';
            const btn = document.getElementById('glyph-info-toggle');
            if (btn)
                btn.textContent = 'Hide glyph info';
        }
        if (state.fontSize !== null) {
            const slider = document.getElementById('font-size');
            if (slider) {
                slider.value = String(state.fontSize);
                const next = slider.nextElementSibling;
                if (next)
                    next.textContent = `${state.fontSize}px`;
                this.glyphAnimator.displayElement.style.fontSize = `${state.fontSize}px`;
            }
        }
        if (state.verticalPosition !== null) {
            const slider = document.getElementById('vertical-position');
            if (slider) {
                slider.value = String(state.verticalPosition);
                const reversedPosition = parseInt(slider.max, 10) - state.verticalPosition;
                const next = slider.nextElementSibling;
                if (next)
                    next.textContent = `${reversedPosition}%`;
                this.glyphAnimator.displayElement.style.top = `${reversedPosition - 50}%`;
            }
        }
        if (state.animationDelay !== null) {
            const slider = document.getElementById('animation-delay');
            if (slider) {
                slider.value = String(state.animationDelay);
                const next = slider.nextElementSibling;
                if (next)
                    next.textContent = `${state.animationDelay}ms`;
                this.glyphAnimator.interval = state.animationDelay;
            }
        }
    }
    /** Called by AppShell before the DOM is torn down. */
    destroy() {
        this._saveHyperFlipState();
        this.glyphAnimator.stop();
        document.removeEventListener('keydown', this._keyHandler);
        this._resizeObserver.disconnect();
        this.uiControls.destroy();
        this.dragAndDrop.destroy();
    }
}
// ---------------------------------------------------------------------------
// Standalone (non-SPA) bootstrap
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const app = new FontViewer();
    initAppNav();
    void app.fontLoader.restoreFromSession();
});
export default FontViewer;
//# sourceMappingURL=HyperFlip.js.map
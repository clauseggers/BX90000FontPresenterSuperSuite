// =============================================================================
// galleyproof/GalleyProof.ts
// =============================================================================
import { FontLoader } from '../core/FontLoader.js';
import { FontInfoRenderer } from '../core/FontInfo.js';
import { UIControls } from '../shared/UIControls.js';
import { DragAndDrop } from '../shared/DragAndDrop.js';
import { OpenTypeFeatures } from '../wordmaster/OpenTypeFeatures.js';
import { VariationAxes } from '../shared/VariationAxes.js';
import { initAppNav } from '../shared/AppNav.js';
export class GalleyProof {
    fontLoader;
    uiControls;
    dragAndDrop;
    openTypeFeatures;
    variationAxes;
    container;
    currentVariationSettings = 'normal';
    _keyHandler;
    constructor() {
        this.container = document.getElementById('galley');
        if (this.container) {
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.position = 'relative';
            this.container.style.overflow = 'auto';
            this.container.style.scrollbarWidth = 'none';
            this.container.style.msOverflowStyle = 'none';
            this.container.style.display = 'flex';
            this.container.style.justifyContent = 'center';
        }
        this.openTypeFeatures = new OpenTypeFeatures((featureString) => {
            this.updateFeatures(featureString);
        });
        this.uiControls = new UIControls();
        this.fontLoader = new FontLoader({
            onFontLoaded: (result) => { this.handleFontLoaded(result); },
        });
        this.dragAndDrop = new DragAndDrop({
            dropZone: document.body,
            onDrop: (buffer, filename) => {
                void this.fontLoader.loadFont(buffer, filename);
            },
        });
        this.variationAxes = new VariationAxes({
            container: document.getElementById('controls'),
            onChange: (settings) => {
                this.currentVariationSettings = settings;
                const firstChild = this.container?.firstChild;
                if (firstChild)
                    firstChild.style.fontVariationSettings = settings;
            },
        });
        this._keyHandler = (event) => {
            if (event.key === 'f')
                this.uiControls.toggleFullscreen();
        };
        this.setupEventListeners();
        this.initializeSliders();
    }
    // ---------------------------------------------------------------------------
    // Sliders
    // ---------------------------------------------------------------------------
    initializeSliders() {
        const sliders = document.querySelectorAll('.slider-container');
        // Font size slider
        this.initSlider(sliders[0], { min: '0.3', max: '8', step: '0.01', initial: 1 }, (val, display) => {
            display.textContent = `${val}rem`;
        }, (val) => {
            document.documentElement.style.setProperty('--galley-font-size', `${val}rem`);
        }, (val) => `${val}rem`, parseFloat);
        // Leading slider
        this.initSlider(sliders[1], { min: '0.5', max: '4', step: '0.01', initial: 1.2 }, (val, display) => {
            display.textContent = `${val.toFixed(2)}×`;
        }, (val) => {
            const firstChild = this.container?.firstChild;
            if (firstChild)
                firstChild.style.lineHeight = String(val);
        }, (val) => `${val.toFixed(2)}×`, parseFloat);
        // Column width slider
        this.initSlider(sliders[2], { min: '20', max: '100', step: '1', initial: 60 }, (val, display) => {
            display.textContent = `${val}%`;
        }, (val) => {
            const firstChild = this.container?.firstChild;
            if (firstChild)
                firstChild.style.width = `${val}%`;
        }, (val) => `${val}%`, parseInt);
        // Letter spacing slider
        this.initSlider(sliders[3], { min: '-0.2', max: '0.5', step: '0.001', initial: 0 }, (val, display) => {
            display.textContent = `${val.toFixed(3)} em`;
        }, (val) => {
            const firstChild = this.container?.firstChild;
            if (firstChild)
                firstChild.style.letterSpacing = `${val}em`;
        }, (val) => `${val.toFixed(3)} em`, parseFloat);
        // Word spacing slider
        this.initSlider(sliders[4], { min: '-1', max: '2', step: '0.001', initial: 0 }, (val, display) => {
            display.textContent = `${val.toFixed(3)} em`;
        }, (val) => {
            const firstChild = this.container?.firstChild;
            if (firstChild)
                firstChild.style.wordSpacing = `${val}em`;
        }, (val) => `${val.toFixed(3)} em`, parseFloat);
    }
    /** Generic slider wiring helper. */
    initSlider(container, config, onDisplay, onApply, formatInitial, parse) {
        if (!container)
            return;
        const slider = container.querySelector('input[type="range"]');
        const display = container.querySelector('.value');
        if (!slider)
            return;
        slider.min = config.min;
        slider.max = config.max;
        slider.step = config.step;
        slider.value = String(config.initial);
        if (display)
            display.textContent = formatInitial(config.initial);
        slider.addEventListener('input', () => {
            const val = parse(slider.value, 10);
            if (display)
                onDisplay(val, display);
            onApply(val);
        });
    }
    // ---------------------------------------------------------------------------
    // Setup / teardown
    // ---------------------------------------------------------------------------
    setupEventListeners() {
        this.uiControls.setupSharedButtons();
        document.addEventListener('keydown', this._keyHandler);
    }
    // ---------------------------------------------------------------------------
    // Text loading
    // ---------------------------------------------------------------------------
    async loadText() {
        try {
            const response = await fetch('word_lists/kongens_fald_html.txt');
            const innerHTML = await response.text();
            if (!this.container)
                return;
            if (!this.container.firstChild) {
                const textEl = document.createElement('div');
                textEl.innerHTML = innerHTML;
                textEl.style.width = '60%';
                textEl.style.fontSize = '1rem';
                textEl.style.lineHeight = '1.5';
                this.container.appendChild(textEl);
            }
            else {
                this.container.firstChild.innerHTML = innerHTML;
            }
        }
        catch (err) {
            console.error('Error loading text:', err);
        }
    }
    // ---------------------------------------------------------------------------
    // Font loaded
    // ---------------------------------------------------------------------------
    handleFontLoaded({ font, fontInfo, fontFamily, buffer }) {
        FontInfoRenderer.renderFontInfo(document.getElementById('font-info-content'), fontInfo);
        void this.loadText().then(() => {
            const textEl = this.container?.firstChild;
            if (textEl) {
                textEl.style.fontFamily = `"${fontFamily}"`;
                textEl.style.fontFeatureSettings = 'normal';
                textEl.style.fontVariationSettings = this.currentVariationSettings;
                textEl.style.letterSpacing = '0em';
                textEl.style.wordSpacing = '0em';
                textEl.style.lineHeight = '1.20';
                // Reset slider displays
                const sliders = document.querySelectorAll('.slider-container');
                const resetSlider = (container, value, label) => {
                    if (!container)
                        return;
                    const s = container.querySelector('input[type="range"]');
                    const v = container.querySelector('.value');
                    if (s)
                        s.value = value;
                    if (v)
                        v.textContent = label;
                };
                resetSlider(sliders[1], '1.20', '1.20×');
                resetSlider(sliders[3], '0', '0 em');
                resetSlider(sliders[4], '0', '0 em');
            }
        });
        this.openTypeFeatures.clear();
        this.openTypeFeatures.extractFeatures(fontInfo, font, buffer);
        this.openTypeFeatures.createButtons();
        if (fontInfo.axes.length > 0) {
            this.variationAxes.createAxesControls(fontInfo.axes, fontInfo.instances);
        }
    }
    updateFeatures(featureString) {
        const firstChild = this.container?.firstChild;
        if (firstChild)
            firstChild.style.fontFeatureSettings = featureString;
    }
    destroy() {
        document.removeEventListener('keydown', this._keyHandler);
        this.uiControls.destroy();
        this.dragAndDrop.destroy();
    }
}
// ---------------------------------------------------------------------------
// Standalone bootstrap
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const app = new GalleyProof();
    initAppNav();
    void app.fontLoader.restoreFromSession();
});
//# sourceMappingURL=GalleyProof.js.map
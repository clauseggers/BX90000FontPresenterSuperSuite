// =============================================================================
// shared/UIControls.ts
// =============================================================================
const DARK_MODE_KEY = 'bx90000_dark_mode';
const FONT_INFO_KEY = 'bx90000_font_info';
const FULLSCREEN_KEY = 'bx90000_fullscreen';
const COLOUR_CHOICE_KEY = 'bx90000_colour_choice';
const DEFAULT_COLOUR = 'hsl(0deg 0% 0%)';
const COLOURS = [
    { label: 'Black', value: 'hsl(0deg 0% 0%)' },
    { label: 'Red', value: 'hsl(356deg 100% 60%)' },
    { label: 'Purple', value: 'hsl(256deg 100% 60%)' },
    { label: 'Blue', value: 'hsl(222deg 100% 60%)' },
    { label: 'Orange', value: 'hsl(32deg 100% 50%)' },
    { label: 'Green', value: 'hsl(100deg 60% 50%)' },
    { label: 'Cyan', value: 'hsl(185deg 85% 55%)' },
    { label: 'Magenta', value: 'hsl(315deg 80% 60%)' },
];
export class UIControls {
    isDarkMode;
    activeColour;
    isFullscreen;
    // Bound listener — kept so destroy() can remove the exact same reference.
    _fullscreenHandler;
    constructor() {
        this.isDarkMode = sessionStorage.getItem(DARK_MODE_KEY) === 'true';
        this.activeColour = sessionStorage.getItem(COLOUR_CHOICE_KEY) ?? DEFAULT_COLOUR;
        this.isFullscreen = Boolean(document.fullscreenElement ??
            document.webkitFullscreenElement ??
            document.mozFullScreenElement ??
            document.msFullscreenElement);
        this._fullscreenHandler = () => this.handleFullscreenChange();
        this._applyStoredColorScheme();
        this._setupEventListeners();
    }
    // -------------------------------------------------------------------------
    // State restoration
    // -------------------------------------------------------------------------
    _applyStoredColorScheme() {
        if (this.isDarkMode) {
            document.documentElement.style.setProperty('--white', this.activeColour);
            document.documentElement.style.setProperty('--black', 'rgb(255, 255, 255)');
        }
        else {
            document.documentElement.style.setProperty('--black', this.activeColour);
        }
    }
    // -------------------------------------------------------------------------
    // Wire up shared DOM buttons. Call once after the DOM is ready.
    // -------------------------------------------------------------------------
    setupSharedButtons() {
        // --- Fullscreen button ---
        const fullscreenButton = document.getElementById('fullscreen-button');
        if (fullscreenButton) {
            fullscreenButton.textContent = this.isFullscreen ? 'Windowed' : 'Fullscreen';
            if (sessionStorage.getItem(FULLSCREEN_KEY) === 'true') {
                document.documentElement.requestFullscreen?.().catch(() => { });
            }
            fullscreenButton.addEventListener('click', () => { this.toggleFullscreen(); });
        }
        // --- Font-info toggle ---
        const fontInfoToggle = document.getElementById('font-info-toggle');
        const fontInfo = document.getElementById('font-info');
        if (fontInfoToggle && fontInfo) {
            if (sessionStorage.getItem(FONT_INFO_KEY) === 'true') {
                fontInfo.style.display = 'block';
                fontInfoToggle.textContent = 'Hide font info';
            }
            fontInfoToggle.addEventListener('click', () => {
                const isVisible = fontInfo.style.display !== 'none';
                fontInfo.style.display = isVisible ? 'none' : 'block';
                fontInfoToggle.textContent = isVisible ? 'Show font info' : 'Hide font info';
                sessionStorage.setItem(FONT_INFO_KEY, String(!isVisible));
            });
        }
        // --- Colour picker ---
        const colourPicker = document.getElementById('colour-picker');
        if (colourPicker) {
            colourPicker.innerHTML = COLOURS.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
            colourPicker.value = this.activeColour;
            colourPicker.addEventListener('change', () => {
                this.activeColour = colourPicker.value;
                sessionStorage.setItem(COLOUR_CHOICE_KEY, this.activeColour);
                if (this.isDarkMode) {
                    document.documentElement.style.setProperty('--white', this.activeColour);
                }
                else {
                    document.documentElement.style.setProperty('--black', this.activeColour);
                }
                colourPicker.blur();
            });
        }
        // --- Background / colour-swap toggle ---
        const backgroundToggle = document.getElementById('background-toggle');
        if (backgroundToggle) {
            backgroundToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleColorScheme();
            });
        }
    }
    // -------------------------------------------------------------------------
    // Fullscreen helpers
    // -------------------------------------------------------------------------
    _setupEventListeners() {
        document.addEventListener('fullscreenchange', this._fullscreenHandler);
        document.addEventListener('webkitfullscreenchange', this._fullscreenHandler);
        document.addEventListener('mozfullscreenchange', this._fullscreenHandler);
        document.addEventListener('MSFullscreenChange', this._fullscreenHandler);
    }
    /** Removes all document-level listeners added by this instance. */
    destroy() {
        document.removeEventListener('fullscreenchange', this._fullscreenHandler);
        document.removeEventListener('webkitfullscreenchange', this._fullscreenHandler);
        document.removeEventListener('mozfullscreenchange', this._fullscreenHandler);
        document.removeEventListener('MSFullscreenChange', this._fullscreenHandler);
    }
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
        else {
            this.enterFullscreen();
        }
    }
    enterFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            void elem.requestFullscreen();
        }
        else if (elem.webkitRequestFullscreen) {
            void elem.webkitRequestFullscreen();
        }
        else if (elem.msRequestFullscreen) {
            void elem.msRequestFullscreen();
        }
    }
    exitFullscreen() {
        if (document.exitFullscreen) {
            void document.exitFullscreen();
        }
        else if (document.webkitExitFullscreen) {
            void document.webkitExitFullscreen();
        }
        else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
    handleFullscreenChange() {
        this.isFullscreen = Boolean(document.fullscreenElement ??
            document.webkitFullscreenElement ??
            document.mozFullScreenElement ??
            document.msFullscreenElement);
        sessionStorage.setItem(FULLSCREEN_KEY, String(this.isFullscreen));
        const btn = document.getElementById('fullscreen-button');
        if (btn) {
            btn.textContent = this.isFullscreen ? 'Windowed' : 'Fullscreen';
        }
    }
    // -------------------------------------------------------------------------
    // Colour scheme toggle
    // -------------------------------------------------------------------------
    toggleColorScheme() {
        this.isDarkMode = !this.isDarkMode;
        sessionStorage.setItem(DARK_MODE_KEY, String(this.isDarkMode));
        document.documentElement.style.setProperty('--white', this.isDarkMode ? this.activeColour : 'rgb(255, 255, 255)');
        document.documentElement.style.setProperty('--black', this.isDarkMode ? 'rgb(255, 255, 255)' : this.activeColour);
    }
}
//# sourceMappingURL=UIControls.js.map
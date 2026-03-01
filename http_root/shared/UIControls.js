// =============================================================================
// shared/UIControls.js
// =============================================================================

const DARK_MODE_KEY  = 'bx90000_dark_mode';
const FONT_INFO_KEY  = 'bx90000_font_info';
const FULLSCREEN_KEY = 'bx90000_fullscreen';

export class UIControls {
  constructor(options = {}) {
    this.isDarkMode = sessionStorage.getItem(DARK_MODE_KEY) === 'true';
    // Read the real fullscreen state rather than assuming false, so that
    // button labels stay correct when an app is swapped while in fullscreen.
    this.isFullscreen = Boolean(
      document.fullscreenElement       ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement    ||
      document.msFullscreenElement
    );
    this._applyStoredColorScheme();
    this.setupEventListeners();
  }

  // -------------------------------------------------------------------------
  // State restoration
  // -------------------------------------------------------------------------

  _applyStoredColorScheme() {
    if (this.isDarkMode) {
      document.documentElement.style.setProperty('--white', 'rgb(0, 0, 0)');
      document.documentElement.style.setProperty('--black', 'rgb(255, 255, 255)');
    }
  }

  // -------------------------------------------------------------------------
  // Wire up the three shared buttons and restore their persisted state.
  // Call this once per page after the DOM is ready.
  // -------------------------------------------------------------------------

  setupSharedButtons() {
    // --- Fullscreen button ---
    const fullscreenButton = document.getElementById('fullscreen-button');
    if (fullscreenButton) {
      // Reflect actual state immediately so the label is correct after an app swap.
      fullscreenButton.textContent = this.isFullscreen ? 'Windowed' : 'Fullscreen';

      // Attempt to restore fullscreen across navigation.
      // The browser may reject this if the page wasn't opened via a user
      // gesture; if so it fails silently.
      if (sessionStorage.getItem(FULLSCREEN_KEY) === 'true') {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }

      fullscreenButton.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // --- Font-info toggle ---
    const fontInfoToggle = document.getElementById('font-info-toggle');
    const fontInfo       = document.getElementById('font-info');
    if (fontInfoToggle && fontInfo) {
      // Restore visibility
      if (sessionStorage.getItem(FONT_INFO_KEY) === 'true') {
        fontInfo.style.display     = 'block';
        fontInfoToggle.textContent = 'Hide font info';
      }

      fontInfoToggle.addEventListener('click', () => {
        const isVisible = fontInfo.style.display !== 'none';
        fontInfo.style.display     = isVisible ? 'none' : 'block';
        fontInfoToggle.textContent = isVisible ? 'Show font info' : 'Hide font info';
        sessionStorage.setItem(FONT_INFO_KEY, String(!isVisible));
      });
    }

    // --- Background / colour-swap toggle ---
    const backgroundToggle = document.getElementById('background-toggle');
    if (backgroundToggle) {
      backgroundToggle.addEventListener('click', (event) => {
        event.preventDefault();
        this.toggleColorScheme();
      });
    }
  }

  // -------------------------------------------------------------------------
  // Fullscreen helpers
  // -------------------------------------------------------------------------

  setupEventListeners() {
    // Save bound reference so destroy() can remove the same listener.
    this._fullscreenHandler = this.handleFullscreenChange.bind(this);
    // Fullscreen change events for different browsers
    document.addEventListener('fullscreenchange',       this._fullscreenHandler);
    document.addEventListener('webkitfullscreenchange', this._fullscreenHandler);
    document.addEventListener('mozfullscreenchange',    this._fullscreenHandler);
    document.addEventListener('MSFullscreenChange',     this._fullscreenHandler);
  }

  // Remove all document-level listeners added by this instance.
  destroy() {
    document.removeEventListener('fullscreenchange',       this._fullscreenHandler);
    document.removeEventListener('webkitfullscreenchange', this._fullscreenHandler);
    document.removeEventListener('mozfullscreenchange',    this._fullscreenHandler);
    document.removeEventListener('MSFullscreenChange',     this._fullscreenHandler);
  }

  toggleFullscreen() {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  handleFullscreenChange() {
    this.isFullscreen = Boolean(
      document.fullscreenElement       ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement    ||
      document.msFullscreenElement
    );

    sessionStorage.setItem(FULLSCREEN_KEY, String(this.isFullscreen));

    // Update button text
    const fullscreenButton = document.getElementById('fullscreen-button');
    if (fullscreenButton) {
      fullscreenButton.textContent = this.isFullscreen ? 'Windowed' : 'Fullscreen';
    }
  }

  // -------------------------------------------------------------------------
  // Colour scheme
  // -------------------------------------------------------------------------

  toggleColorScheme() {
    this.isDarkMode = !this.isDarkMode;
    sessionStorage.setItem(DARK_MODE_KEY, String(this.isDarkMode));
    document.documentElement.style.setProperty(
      '--white',
      this.isDarkMode ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'
    );
    document.documentElement.style.setProperty(
      '--black',
      this.isDarkMode ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'
    );
  }
}
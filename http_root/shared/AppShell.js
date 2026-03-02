// =============================================================================
// shared/AppShell.js
// Single-page app shell. Swaps app content without a navigation, so the
// browser remains in full-screen mode across tool switches.
// =============================================================================

import { initAppNav } from './AppNav.js';

// ---------------------------------------------------------------------------
// HTML fragment helpers — shared structural pieces
// ---------------------------------------------------------------------------

// Top bar with the shared colour picker, swap, and fullscreen buttons.
// Pass any app-specific button HTML as extraButtons.
function topBar(extraButtons = '') {
    return `
      <div id="topBar">
        <div id="appFunctions">
          ${extraButtons}
          <select id="colour-picker"></select>
          <button id="background-toggle">Swap colours</button>
          <button id="fullscreen-button">Fullscreen</button>
        </div>
      </div>`;
}

// Drop-zone prompt shown before a font is loaded.
const DROP_TEXT = `<div id="drop-text">Drop your TTF or OTF font here</div>`;

// A single font-info panel (used by wordmaster and galleyproof).
const FONT_INFO_PANEL = `
      <div id="info-panels">
        <div id="font-info" style="display: none;">
          <div id="font-info-content"></div>
        </div>
      </div>`;

// OpenType feature toggle buttons row.
const OT_FEATURES = `
        <div class="buttons-container">
          <label>OpenType features</label>
          <div class="feature-buttons-wrapper"></div>
        </div>`;

// A labelled range slider with a displayed current value.
function slider(label, attrs, defaultText) {
    return `
        <div class="slider-container">
          <label>${label}</label>
          <input type="range" ${attrs}>
          <span class="value">${defaultText}</span>
        </div>`;
}

// ---------------------------------------------------------------------------
// App descriptors
// ---------------------------------------------------------------------------

const APPS = {
    hyperflip: {
        title:    'HyperFlip BX90000 Dominator',
        module:   () => import('../hyperflip/HyperFlip.js'),
        getClass: (mod) => mod.default,
        html: `
      ${topBar(`
          <button id="randomize-button">Randomize glyph order</button>
          <button id="metrics-toggle">Show metrics</button>
          <button id="glyph-info-toggle">Show glyph info</button>
          <button id="font-info-toggle">Show font info</button>`)}

      ${DROP_TEXT}

      <div class="display-container">
        <div id="glyph-display" class="glyph-buffer"></div>
      </div>

      <div id="info-panels">
        <div id="glyph-info" style="display: none;">
          <div id="glyph-info-content"></div>
        </div>
        <div id="font-info" style="display: none;">
          <div id="font-info-content"></div>
        </div>
      </div>

      <div class="metrics-container">
        <div id="font-metrics-overlay"></div>
      </div>

      <div id="controls">
        ${slider('Font size',         'id="font-size" min="100" max="1000" value="600"',     '600px')}
        ${slider('Vertical position', 'id="vertical-position" min="0" max="100" value="50"', '50%')}
        ${slider('Animation delay',   'id="animation-delay" min="16" max="2000" value="500"','500ms')}
      </div>
    `,
    },

    wordmaster: {
        title:    'WordMaster BX90000 Excelsior',
        module:   () => import('../wordmaster/WordMaster.js'),
        getClass: (mod) => mod.WordAnimator,
        html: `
      ${topBar(`<button id="font-info-toggle">Show font info</button>`)}

      ${DROP_TEXT}

      <div class="display-container">
        <div id="word"></div>
        <div id="glyph-display" class="glyph-buffer"></div>
      </div>

      ${FONT_INFO_PANEL}

      <div id="font-metrics-overlay"></div>

      <div id="controls">
        ${OT_FEATURES}
        ${slider('Font size',       'min="10" max="1000" value="600"',           '600px')}
        ${slider('Animation delay', 'min="100" max="10000" value="3000"',        '3000ms')}
      </div>
    `,
    },

    galleyproof: {
        title:    'Galley Proof BX90000 Zenith',
        module:   () => import('../galleyproof/GalleyProof.js'),
        getClass: (mod) => mod.GalleyProof,
        html: `
      ${topBar(`<button id="font-info-toggle">Show font info</button>`)}

      ${DROP_TEXT}

      <div class="display-container">
        <div id="galley"></div>
        <div id="glyph-display" class="glyph-buffer"></div>
      </div>

      ${FONT_INFO_PANEL}

      <div id="controls">
        ${OT_FEATURES}
        ${slider('Font size',      'min="0.3" max="8" step="0.01" value="1"',        '1 rem')}
        ${slider('Leading',        'min="0.5" max="4" step="0.01" value="1.20"',     '1.20×')}
        ${slider('Column width',   'min="20" max="100" value="60"',                  '60%')}
        ${slider('Letter spacing', 'min="-0.2" max="0.5" step="0.001" value="0"',   '0 em')}
        ${slider('Word spacing',   'min="-1" max="2" step="0.001" value="0"',        '0 em')}
      </div>
    `,
    },

    turbotiler: {
        title:    'TurboTiler BX90000 Fascination',
        module:   () => import('../turbotiler/TurboTiler.js'),
        getClass: (mod) => mod.TurboTiler,
        html: `
      ${topBar()}

      ${DROP_TEXT}

      <div id="zoom-container">
        <div id="grid-container"></div>
      </div>
    `,
    },
};

// Map HTML filenames (used in AppNav links) to app keys.
const HREF_TO_KEY = {
    'HyperFlipBX90000Dominator.html':    'hyperflip',
    'WordMasterBX90000Excelsior.html':   'wordmaster',
    'GalleyProofBX90000Zenith.html':     'galleyproof',
    'TurboTilerBX90000Fascination.html': 'turbotiler',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentApp = null;
let currentKey = null;

// ---------------------------------------------------------------------------
// switchApp — the public API for the shell
// ---------------------------------------------------------------------------

export async function switchApp(key) {
    if (key === currentKey) return;

    // Tear down the running app before touching the DOM.
    if (currentApp?.destroy) {
        currentApp.destroy();
    }
    currentApp = null;
    currentKey = null;

    const descriptor = APPS[key];
    if (!descriptor) {
        console.error(`AppShell: unknown app key "${key}"`);
        return;
    }

    // Swap body content.
    const container = document.getElementById('app-container');
    container.innerHTML = descriptor.html;

    // Update browser tab title.
    document.title = descriptor.title;

    // Inject the nav (requires #topBar to already be in the DOM).
    initAppNav(key, (href) => {
        const nextKey = HREF_TO_KEY[href];
        if (nextKey) switchApp(nextKey);
    });

    // Dynamically import the module and instantiate.
    const mod      = await descriptor.module();
    const AppClass = descriptor.getClass(mod);
    currentApp     = new AppClass();
    currentKey     = key;

    // Restore font from the previous session if available.
    currentApp.fontLoader?.restoreFromSession?.();
}

// ---------------------------------------------------------------------------
// Bootstrap — load HyperFlip on startup.
// ---------------------------------------------------------------------------

switchApp('hyperflip');

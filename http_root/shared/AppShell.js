// =============================================================================
// shared/AppShell.js
// Single-page app shell. Swaps app content without a navigation, so the
// browser remains in full-screen mode across tool switches.
// =============================================================================

import { initAppNav } from './AppNav.js';

// ---------------------------------------------------------------------------
// App descriptors — HTML templates are the body content of each tool page.
// ---------------------------------------------------------------------------

const APPS = {
    hyperflip: {
        title:    'HyperFlip BX90000 Dominator',
        module:   () => import('../hyperflip/HyperFlip.js'),
        getClass: (mod) => mod.default,
        html: `
      <div id="fullScreen">
        <button id="randomize-button">Randomize glyph order</button>
        <button id="metrics-toggle">Show metrics</button>
        <button id="glyph-info-toggle">Show glyph info</button>
        <button id="font-info-toggle">Show font info</button>
        <button id="background-toggle">Swap colours</button>
        <button id="fullscreen-button">Fullscreen</button>
      </div>

      <div id="drop-text">Drop your TTF or OTF font here</div>

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
        <div class="slider-container">
          <label>Font size</label>
          <input type="range" id="font-size" min="100" max="1000" value="600">
          <span class="value">600px</span>
        </div>
        <div class="slider-container">
          <label>Vertical position</label>
          <input type="range" id="vertical-position" min="0" max="100" value="50">
          <span class="value">50%</span>
        </div>
        <div class="slider-container">
          <label>Animation delay</label>
          <input type="range" id="animation-delay" min="16" max="1000" value="100">
          <span class="value">100ms</span>
        </div>
      </div>
    `,
    },

    wordmaster: {
        title:    'WordMaster BX90000 Excelsior',
        module:   () => import('../wordmaster/WordMaster.js'),
        getClass: (mod) => mod.WordAnimator,
        html: `
      <div id="fullScreen">
        <button id="font-info-toggle">Show font info</button>
        <button id="background-toggle">Swap colours</button>
        <button id="fullscreen-button">Fullscreen</button>
      </div>

      <div id="drop-text">Drop your TTF or OTF font here</div>

      <div class="display-container">
        <div id="word"></div>
        <div id="glyph-display" class="glyph-buffer"></div>
      </div>

      <div id="info-panels">
        <div id="font-info" style="display: none;">
          <div id="font-info-content"></div>
        </div>
      </div>

      <div id="font-metrics-overlay"></div>

      <div id="controls">
        <div class="buttons-container">
          <label>OpenType features</label>
          <div class="feature-buttons-wrapper"></div>
        </div>
        <div class="slider-container">
          <label>Font size</label>
          <input type="range" min="10" max="1000" value="600">
          <span class="value">600px</span>
        </div>
        <div class="slider-container">
          <label>Animation delay</label>
          <input type="range" min="100" max="10000" value="3000">
          <span class="value">3000ms</span>
        </div>
      </div>
    `,
    },

    galleyproof: {
        title:    'Galley Proof BX90000 Zenith',
        module:   () => import('../galleyproof/GalleyProof.js'),
        getClass: (mod) => mod.GalleyProof,
        html: `
      <div id="fullScreen">
        <button id="font-info-toggle">Show font info</button>
        <button id="background-toggle">Swap colours</button>
        <button id="fullscreen-button">Fullscreen</button>
      </div>

      <div id="drop-text">Drop your TTF or OTF font here</div>

      <div class="display-container">
        <div id="galley"></div>
        <div id="glyph-display" class="glyph-buffer"></div>
      </div>

      <div id="info-panels">
        <div id="font-info" style="display: none;">
          <div id="font-info-content"></div>
        </div>
      </div>

      <div id="controls">
        <div class="buttons-container">
          <label>OpenType features</label>
          <div class="feature-buttons-wrapper"></div>
        </div>
        <div class="slider-container">
          <label>Font size</label>
          <input type="range" min="0.3" max="8" step="0.01" value="1">
          <span class="value">1 rem</span>
        </div>
        <div class="slider-container">
          <label>Leading</label>
          <input type="range" min="0.5" max="4" step="0.01" value="1.20">
          <span class="value">1.20×</span>
        </div>
        <div class="slider-container">
          <label>Column width</label>
          <input type="range" min="20" max="100" value="60">
          <span class="value">60%</span>
        </div>
        <div class="slider-container">
          <label>Letter spacing</label>
          <input type="range" min="-0.2" max="0.5" step="0.001" value="0">
          <span class="value">0 em</span>
        </div>
        <div class="slider-container">
          <label>Word spacing</label>
          <input type="range" min="-1" max="2" step="0.001" value="0">
          <span class="value">0 em</span>
        </div>
      </div>
    `,
    },

    turbotiler: {
        title:    'TurboTiler BX90000 Fascination',
        module:   () => import('../turbotiler/TurboTiler.js'),
        getClass: (mod) => mod.TurboTiler,
        html: `
      <div id="fullScreen">
        <button id="background-toggle" type="button">Swap colours</button>
        <button id="fullscreen-button" type="button">Fullscreen</button>
      </div>

      <div id="drop-text">Drop your TTF or OTF font here</div>

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

    // Inject the nav (requires #fullScreen to already be in the DOM).
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

// =============================================================================
// shared/AppShell.ts
// Single-page app shell. Swaps app content without navigation so the browser
// remains in full-screen mode across tool switches.
// =============================================================================

import { initAppNav } from './AppNav.js';

// ---------------------------------------------------------------------------
// Minimal interface that every app class must satisfy
// ---------------------------------------------------------------------------

export interface AppInstance {
  fontLoader?: { restoreFromSession?: () => Promise<void> };
  destroy?:    () => void;
}

export type AppConstructor = new () => AppInstance;

// ---------------------------------------------------------------------------
// HTML fragment helpers
// ---------------------------------------------------------------------------

function topBar(extraButtons = ''): string {
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

const DROP_TEXT = `<div id="drop-text">Drop your TTF or OTF font here</div>`;

const FONT_INFO_PANEL = `
      <div id="info-panels">
        <div id="font-info" style="display: none;">
          <div id="font-info-content"></div>
        </div>
      </div>`;

const OT_FEATURES = `
        <div class="buttons-container">
          <span class="controls-section-heading">OpenType features</span>
          <div class="feature-buttons-wrapper"></div>
        </div>`;

function slider(id: string, label: string, attrs: string, defaultText: string): string {
  return `
        <div class="slider-container">
          <label for="${id}">${label}</label>
          <input type="range" id="${id}" ${attrs}>
          <span class="value">${defaultText}</span>
        </div>`;
}

// ---------------------------------------------------------------------------
// App descriptors
// ---------------------------------------------------------------------------

interface AppDescriptor {
  title:    string;
  module:   () => Promise<Record<string, unknown>>;
  getClass: (mod: Record<string, unknown>) => AppConstructor;
  html:     string;
}

const APPS: Readonly<Record<string, AppDescriptor>> = {
  hyperflip: {
    title:    'HyperFlip BX90000 Dominator',
    module:   () => import('../hyperflip/HyperFlip.js') as Promise<Record<string, unknown>>,
    getClass: (mod) => (mod['default'] as AppConstructor),
    html: `
      ${topBar(`
          <button id="randomise-button">Randomise glyph order</button>
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
        ${slider('font-size',          'Font size',         'min="100" max="1000" value="600"',     '600px')}
        ${slider('vertical-position',  'Vertical position', 'min="0" max="100" value="50"',          '50%')}
        ${slider('animation-delay',    'Animation delay',   'min="16" max="2000" value="500"',       '500ms')}
      </div>
    `,
  },

  wordmaster: {
    title:    'WordMaster BX90000 Excelsior',
    module:   () => import('../wordmaster/WordMaster.js') as Promise<Record<string, unknown>>,
    getClass: (mod) => (mod['WordAnimator'] as AppConstructor),
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
        ${slider('wordmaster-font-size',       'Font size',       'min="10" max="1000" value="600"',    '600px')}
        ${slider('wordmaster-animation-delay', 'Animation delay', 'min="100" max="10000" value="3000"', '3000ms')}
      </div>
    `,
  },

  galleyproof: {
    title:    'Galley Proof BX90000 Zenith',
    module:   () => import('../galleyproof/GalleyProof.js') as Promise<Record<string, unknown>>,
    getClass: (mod) => (mod['GalleyProof'] as AppConstructor),
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
        ${slider('galley-font-size',      'Font size',      'min="0.3" max="8" step="0.01" value="1"',       '1 rem')}
        ${slider('galley-leading',        'Leading',        'min="0.5" max="4" step="0.01" value="1.20"',    '1.20×')}
        ${slider('galley-column-width',   'Column width',   'min="20" max="100" value="60"',                 '60%')}
        ${slider('galley-letter-spacing', 'Letter spacing', 'min="-0.2" max="0.5" step="0.001" value="0"',  '0 em')}
        ${slider('galley-word-spacing',   'Word spacing',   'min="-1" max="2" step="0.001" value="0"',       '0 em')}
      </div>
    `,
  },

  turbotiler: {
    title:    'TurboTiler BX90000 Fascination',
    module:   () => import('../turbotiler/TurboTiler.js') as Promise<Record<string, unknown>>,
    getClass: (mod) => (mod['TurboTiler'] as AppConstructor),
    html: `
      ${topBar()}

      ${DROP_TEXT}

      <div id="zoom-container">
        <div id="grid-container"></div>
      </div>
    `,
  },
};

const HREF_TO_KEY: Readonly<Record<string, string>> = {
  'HyperFlipBX90000Dominator.html':    'hyperflip',
  'WordMasterBX90000Excelsior.html':   'wordmaster',
  'GalleyProofBX90000Zenith.html':     'galleyproof',
  'TurboTilerBX90000Fascination.html': 'turbotiler',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentApp: AppInstance | null = null;
let currentKey: string | null      = null;

// ---------------------------------------------------------------------------
// switchApp
// ---------------------------------------------------------------------------

export async function switchApp(key: string): Promise<void> {
  if (key === currentKey) return;

  currentApp?.destroy?.();
  currentApp = null;
  currentKey = null;

  const descriptor = APPS[key];
  if (!descriptor) {
    console.error(`AppShell: unknown app key "${key}"`);
    return;
  }

  const container = document.getElementById('app-container');
  if (!container) {
    console.error('AppShell: #app-container not found');
    return;
  }
  container.innerHTML = descriptor.html;

  document.title = descriptor.title;

  initAppNav(key, (href) => {
    const nextKey = HREF_TO_KEY[href];
    if (nextKey) void switchApp(nextKey);
  });

  const mod      = await descriptor.module();
  const AppClass = descriptor.getClass(mod);
  currentApp     = new AppClass();
  currentKey     = key;

  await currentApp.fontLoader?.restoreFromSession?.();
}

// ---------------------------------------------------------------------------
// Bootstrap — load HyperFlip on startup.
// ---------------------------------------------------------------------------

void switchApp('hyperflip');

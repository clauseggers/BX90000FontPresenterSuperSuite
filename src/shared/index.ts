// =============================================================================
// shared/index.ts
// Minimal bootstrap used by the standalone (non-SPA) legacy HTML pages.
// =============================================================================

import { UIControls } from './UIControls.js';

const uiControls = new UIControls();

const fullscreenButton = document.getElementById('fullscreen-button');
fullscreenButton?.addEventListener('click', () => {
  uiControls.toggleFullscreen();
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'f') {
    uiControls.toggleFullscreen();
  }
});

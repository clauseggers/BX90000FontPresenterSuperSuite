// =============================================================================
// shared/index.js
// =============================================================================

import { UIControls } from './UIControls.js';

const uiControls = new UIControls();

// Fullscreen button handler
const fullscreenButton = document.getElementById('fullscreen-button');
fullscreenButton.addEventListener('click', () => {
    uiControls.toggleFullscreen();
});

// Keyboard shortcut
document.addEventListener('keydown', (event) => {
    if (event.key === 'f') {
        uiControls.toggleFullscreen();
    }
});
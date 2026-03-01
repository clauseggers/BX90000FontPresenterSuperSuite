// =============================================================================
// AppNav.js
// Injects persistent app navigation below the fullscreen button on every page.
// Supports both classic multi-page mode and the SPA AppShell mode.
// =============================================================================

const TOOLS = [
    { label: 'HyperFlip',   href: 'HyperFlipBX90000Dominator.html' },
    { label: 'WordMaster',  href: 'WordMasterBX90000Excelsior.html' },
    { label: 'GalleyProof', href: 'GalleyProofBX90000Zenith.html' },
    { label: 'TurboTiler',  href: 'TurboTilerBX90000Fascination.html' },
];

// Map HTML filenames to SPA app keys (used when activeKey is provided).
const HREF_TO_KEY = {
    'HyperFlipBX90000Dominator.html':    'hyperflip',
    'WordMasterBX90000Excelsior.html':   'wordmaster',
    'GalleyProofBX90000Zenith.html':     'galleyproof',
    'TurboTilerBX90000Fascination.html': 'turbotiler',
};

/**
 * Injects the persistent app navigation below the fullscreen button.
 *
 * @param {string|null} activeKey  - SPA app key (e.g. 'hyperflip') that
 *   should be highlighted. When null the active page is inferred from the URL,
 *   which is the correct behaviour for the standalone per-page HTML files.
 * @param {Function|null} onNavigate - Optional callback for SPA navigation.
 *   Receives the href string (e.g. 'HyperFlipBX90000Dominator.html').
 *   When provided, default link navigation is suppressed.
 */
export function initAppNav(activeKey = null, onNavigate = null) {
    const nav = document.createElement('nav');
    nav.id = 'appNav';

    // Fall back to URL-based detection when not in SPA mode.
    const currentPage = window.location.pathname.split('/').pop();

    TOOLS.forEach(({ label, href }) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = label;

        const isActive = activeKey
            ? HREF_TO_KEY[href] === activeKey
            : href === currentPage;

        if (isActive) {
            a.classList.add('active');
            a.setAttribute('aria-current', 'page');
        }

        if (onNavigate) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // Update active highlight immediately for responsiveness.
                nav.querySelectorAll('a').forEach((x) => {
                    x.classList.remove('active');
                    x.removeAttribute('aria-current');
                });
                a.classList.add('active');
                a.setAttribute('aria-current', 'page');
                onNavigate(href);
            });
        }

        nav.appendChild(a);
    });

    const fullScreen = document.getElementById('fullScreen');
    if (fullScreen) {
        fullScreen.insertAdjacentElement('afterend', nav);
    } else {
        document.body.appendChild(nav);
    }
}

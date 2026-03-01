// =============================================================================
// AppNav.js
// Injects persistent app navigation below the fullscreen button on every page.
// =============================================================================

const TOOLS = [
    { label: 'HyperFlip',   href: 'HyperFlipBX90000Dominator.html' },
    { label: 'WordMaster',  href: 'WordMasterBX90000Excelsior.html' },
    { label: 'GalleyProof', href: 'GalleyProofBX90000Zenith.html' },
    { label: 'TurboTiler',  href: 'TurboTilerBX90000Fascination.html' },
];

/**
 * Injects the persistent app navigation below the fullscreen button.
 * Highlights the currently active page.
 */
export function initAppNav() {
    const nav = document.createElement('nav');
    nav.id = 'appNav';

    const currentPage = window.location.pathname.split('/').pop();

    TOOLS.forEach(({ label, href }) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = label;
        if (href === currentPage) {
            a.classList.add('active');
            a.setAttribute('aria-current', 'page');
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

// =============================================================================
// shared/AppNav.ts
// Injects persistent app navigation below the fullscreen button on every page.
// Supports both classic multi-page mode and the SPA AppShell mode.
// =============================================================================

interface ToolLink {
  readonly label: string;
  readonly href:  string;
}

const TOOLS: readonly ToolLink[] = [
  { label: 'HyperFlip',   href: 'HyperFlipBX90000Dominator.html' },
  { label: 'WordMaster',  href: 'WordMasterBX90000Excelsior.html' },
  { label: 'GalleyProof', href: 'GalleyProofBX90000Zenith.html' },
  { label: 'TurboTiler',  href: 'TurboTilerBX90000Fascination.html' },
];

const HREF_TO_KEY: Readonly<Record<string, string>> = {
  'HyperFlipBX90000Dominator.html':    'hyperflip',
  'WordMasterBX90000Excelsior.html':   'wordmaster',
  'GalleyProofBX90000Zenith.html':     'galleyproof',
  'TurboTilerBX90000Fascination.html': 'turbotiler',
};

/**
 * Injects the persistent app navigation below the fullscreen button.
 *
 * @param activeKey   SPA app key (e.g. `'hyperflip'`) to highlight.
 *                    When null the active page is inferred from the URL.
 * @param onNavigate  Optional SPA navigation callback receiving the href string.
 *                    When provided, default link navigation is suppressed.
 */
export function initAppNav(
  activeKey:   string | null = null,
  onNavigate?: ((href: string) => void) | null,
): void {
  const nav = document.createElement('nav');
  nav.id = 'appNav';

  const currentPage = window.location.pathname.split('/').pop() ?? '';

  for (const { label, href } of TOOLS) {
    const a = document.createElement('a');
    a.href      = href;
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
        // Update highlight immediately for responsiveness.
        nav.querySelectorAll('a').forEach(x => {
          x.classList.remove('active');
          x.removeAttribute('aria-current');
        });
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
        onNavigate(href);
      });
    }

    nav.appendChild(a);
  }

  const topBar = document.getElementById('topBar');
  if (topBar) {
    topBar.insertAdjacentElement('afterbegin', nav);

    const updateTopbarBottom = (): void => {
      const rect   = topBar.getBoundingClientRect();
      const offset = rect.left < 300 ? `${rect.bottom + 7}px` : '0px';
      document.documentElement.style.setProperty('--topbar-bottom', offset);
    };
    updateTopbarBottom();
    new ResizeObserver(updateTopbarBottom).observe(topBar);
    window.addEventListener('resize', updateTopbarBottom);
  } else {
    document.body.appendChild(nav);
  }
}

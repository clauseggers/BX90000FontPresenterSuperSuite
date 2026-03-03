/**
 * Injects the persistent app navigation below the fullscreen button.
 *
 * @param activeKey   SPA app key (e.g. `'hyperflip'`) to highlight.
 *                    When null the active page is inferred from the URL.
 * @param onNavigate  Optional SPA navigation callback receiving the href string.
 *                    When provided, default link navigation is suppressed.
 */
export declare function initAppNav(activeKey?: string | null, onNavigate?: ((href: string) => void) | null): void;
//# sourceMappingURL=AppNav.d.ts.map
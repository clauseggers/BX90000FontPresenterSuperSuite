// =============================================================================
// src/vendor.d.ts
// Augmentations for vendor-prefixed browser APIs not included in the standard
// TypeScript DOM library (fullscreen, older WebKit/Mozilla/IE variants).
// =============================================================================

interface Document {
  readonly webkitFullscreenElement: Element | null;
  readonly mozFullScreenElement: Element | null;
  readonly msFullscreenElement: Element | null;
  webkitExitFullscreen(): Promise<void>;
  mozCancelFullScreen(): void;
  msExitFullscreen(): void;
}

interface HTMLElement {
  webkitRequestFullscreen(): Promise<void>;
  mozRequestFullScreen(): Promise<void>;
  msRequestFullscreen(): Promise<void>;
}

interface CSSStyleDeclaration {
  msOverflowStyle: string;
}

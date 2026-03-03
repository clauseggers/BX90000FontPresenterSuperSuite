# BX90000 Font Presenter Super Suite - Claude Code Guide

## Project Overview
This is a client-side web application suite for presenting and exploring fonts. It consists of four distinct tools for font visualization, all built with TypeScript (compiled to ES2022 JavaScript) and using the `opentype.js` library for font parsing.

## Architecture

### Four Main Applications
1. **HyperFlip BX90000 Dominator** - Animates individual glyphs from a font
2. **WordMaster BX90000 Excelsior** - Animates words in the selected font
3. **GalleyProof BX90000 Zenith** - Renders text columns for galley proofs
4. **TurboTiler BX90000 Fascination** - Renders repeating tiled patterns of glyphs

Each application has its own HTML entry point and dedicated TypeScript modules.

### Project Structure
```
src/                                 # TypeScript source files (edit these)
├── core/
│   ├── FontLoader.ts                # Font loading and caching
│   ├── FontInfo.ts                  # Font information extraction
│   └── Types.ts                     # Type definitions/utilities
├── shared/
│   ├── index.ts                     # Shared module entry point
│   ├── AppNav.ts                    # Application navigation
│   ├── AppShell.ts                  # Application shell/layout
│   ├── DragAndDrop.ts               # Drag-and-drop font loading
│   ├── FontSession.ts               # Font session management
│   ├── MetricsOverlay.ts            # Font metrics visualisation
│   ├── UIControls.ts                # Common UI controls
│   └── VariationAxes.ts             # Variable font axis controls
├── hyperflip/
│   ├── HyperFlip.ts                 # Main HyperFlip controller
│   └── GlyphAnimator.ts             # Glyph animation logic
├── wordmaster/
│   ├── WordMaster.ts                # Main WordMaster controller
│   ├── TextFitter.ts                # Text sizing logic
│   └── OpenTypeFeatures.ts          # OpenType feature controls
├── galleyproof/
│   └── GalleyProof.ts               # Main GalleyProof controller
├── turbotiler/
│   ├── TurboTiler.ts                # Main TurboTiler controller
│   ├── GridAnimator.ts              # Grid animation logic
│   └── GlyphGrid.ts                 # Glyph grid rendering
├── opentype.d.ts                    # Type declarations for opentype.js
└── vendor.d.ts                      # Type declarations for other vendors

http_root/                           # Compiled output + static assets (do not edit .js/.d.ts files)
├── index.html                       # Main landing page
├── HyperFlipBX90000Dominator.html   # Glyph animator entry point
├── WordMasterBX90000Excelsior.html  # Word animator entry point
├── GalleyProofBX90000Zenith.html    # Galley proof entry point
├── TurboTilerBX90000Fascination.html # Tiled glyph pattern entry point
├── core/                            # Compiled core modules
├── shared/                          # Compiled shared modules
├── hyperflip/                       # Compiled HyperFlip modules
├── wordmaster/                      # Compiled WordMaster modules
├── galleyproof/                     # Compiled GalleyProof modules
├── turbotiler/                      # Compiled TurboTiler modules
├── word_lists/                      # Static word list text files
└── opentypejs/
    └── opentype.js                  # Local copy of OpenType.js
```

## Key Technologies
- **TypeScript** - Source language, compiled to ES2022 JavaScript via `tsc`
- **opentype.js** - Font parsing and manipulation library (local copy)
- **HTML5 Canvas** - For rendering glyphs and text
- **CSS** - For UI and animations
- **Build process** - `npm run build` compiles TypeScript sources from `src/` to `http_root/`

## npm Scripts
- `npm run build` - Compile TypeScript (`tsc`)
- `npm run build:watch` - Watch mode compilation (`tsc --watch`)
- `npm run typecheck` - Type-check without emitting files (`tsc --noEmit`)
- `npm run serve` - Build and start local dev server (same as running `serve.sh`)

## Core Concepts

### Font Loading
- Fonts are loaded via drag-and-drop interface
- `FontLoader.js` handles font file parsing using opentype.js
- Supports both static and variable fonts

### Variable Fonts
- Variable font axes are detected and exposed through UI controls
- `VariationAxes.js` provides sliders for axis manipulation
- Axes include wght (weight), wdth (width), ital (italic), slnt (slant), etc.

### OpenType Features
- Stylistic Sets (ss01–ss20)
- Small caps (smcp)
- Feature toggles in WordMaster and GalleyProof applications

### Font Information
- Font name, family, subfamily
- Name table entries (designer, copyright, licence, etc.)
- Glyph count and character set coverage
- OpenType feature list
- Variable font axes

## UI Patterns

### Control Panel
- Bottom-positioned control panel that appears on hover
- Contains controls for font size, colours, animations, features
- Consistent across all three applications

### Keyboard Controls
- `f` - Toggle fullscreen
- `space` - Pause/continue animation (HyperFlip, WordMaster)
- `h`, `j`, `k`, `l` - Navigation (HyperFlip)
- Arrow keys - Alternative navigation (HyperFlip)

### Colour Modes
- Default: Black text on white background
- Inverted: White text on black background
- Toggle via "Swap colours" control

## Development Guidelines

### Code Style
- Use British spellings (colour, behaviour, licence, etc.)
- Descriptive variable and function names
- Modular structure with clear separation of concerns
- Prefer pure functions where possible

### Module Organization
- Core functionality in `core/` directory
- Shared utilities in `shared/` directory
- Application-specific code in dedicated directories
- Each HTML page imports only what it needs

### Testing
- Test in Chrome browser (primary target)
- Run `npm run build` before serving, or use `serve.sh` (macOS/Linux) / `serve.bat` (Windows) which build automatically
- Requires `http-server` for local development

## Common Tasks

### Adding New Features
1. Determine if feature is shared or app-specific
2. Create or edit `.ts` files in the appropriate `src/` subdirectory (`shared/` or app folder)
3. Run `npm run build` to compile
4. Import the compiled `.js` in the relevant HTML entry point
5. Update control panel if UI is needed

### Modifying Font Information Display
- Font metadata extraction is in `src/core/FontInfo.ts`
- Name table parsing follows OpenType spec conventions
- Display formatting in each application's main module

### Working with Variable Fonts
- Axis detection in `src/core/FontLoader.ts`
- UI controls in `src/shared/VariationAxes.ts`
- Applied via CSS `font-variation-settings`

### Adjusting Animations
- HyperFlip animation timing in `src/hyperflip/GlyphAnimator.ts`
- WordMaster animation timing in `src/wordmaster/WordMaster.ts`
- Use `requestAnimationFrame` for smooth animations

## Important Notes
- No server-side code - entirely client-side
- Font files never leave the browser
- Source is TypeScript in `src/`; never edit the compiled `.js` or `.d.ts` files in `http_root/` directly
- Uses local copy of opentype.js (not CDN)
- MIT licensed
- Designed for font designers and typographers to showcase their work

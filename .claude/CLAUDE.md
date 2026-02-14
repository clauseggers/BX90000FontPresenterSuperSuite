# BX90000 Font Presenter Super Suite - Claude Code Guide

## Project Overview
This is a client-side web application suite for presenting and exploring fonts. It consists of three distinct tools for font visualization, all built with vanilla JavaScript and using the `opentype.js` library for font parsing.

## Architecture

### Three Main Applications
1. **HyperFlip BX90000 Dominator** - Animates individual glyphs from a font
2. **WordMaster BX90000 Excelsior** - Animates words in the selected font
3. **GalleyProof BX90000 Zenith** - Renders text columns for galley proofs

Each application has its own HTML entry point and dedicated JavaScript modules.

### Project Structure
```
http_root/
├── index.html                        # Main landing page
├── HyperFlipBX90000Dominator.html   # Glyph animator entry point
├── WordMasterBX90000Excelsior.html  # Word animator entry point
├── GalleyProofBX90000Zenith.html    # Galley proof entry point
├── core/                            # Core font handling
│   ├── FontLoader.js                # Font loading and caching
│   ├── FontInfo.js                  # Font information extraction
│   └── Types.js                     # Type definitions/utilities
├── shared/                          # Shared functionality
│   ├── index.js                     # Shared module entry point
│   ├── DragAndDrop.js              # Drag-and-drop font loading
│   └── UIControls.js               # Common UI controls
├── hyperflip/                       # HyperFlip specific modules
│   ├── HyperFlip.js                # Main HyperFlip controller
│   ├── GlyphAnimator.js            # Glyph animation logic
│   ├── MetricsOverlay.js           # Font metrics visualization
│   └── VariationAxes.js            # Variable font controls
├── wordmaster/                      # WordMaster specific modules
│   ├── WordMaster.js               # Main WordMaster controller
│   ├── TextFitter.js               # Text sizing logic
│   └── OpenTypeFeatures.js         # OpenType feature controls
├── galleyproof/                     # GalleyProof specific modules
│   └── GalleyProof.js              # Main GalleyProof controller
└── opentypejs/                      # Third-party library
    └── opentype.js                  # Local copy of OpenType.js
```

## Key Technologies
- **Vanilla JavaScript** with ES6 modules
- **opentype.js** - Font parsing and manipulation library (local copy)
- **HTML5 Canvas** - For rendering glyphs and text
- **CSS** - For UI and animations
- **No build process** - Served directly via HTTP server

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
- Stylistic alternates (salt)
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
- Requires `http-server` for local development
- Use `serve.sh` (macOS/Linux) or `serve.bat` (Windows)

## Common Tasks

### Adding New Features
1. Determine if feature is shared or app-specific
2. Place in appropriate directory (`shared/` or app folder)
3. Import in relevant HTML entry point
4. Update control panel if UI is needed

### Modifying Font Information Display
- Font metadata extraction is in `core/FontInfo.js`
- Name table parsing follows OpenType spec conventions
- Display formatting in each application's main module

### Working with Variable Fonts
- Axis detection in FontLoader
- UI controls in `VariationAxes.js`
- Applied via CSS `font-variation-settings`

### Adjusting Animations
- HyperFlip animation timing in `GlyphAnimator.js`
- WordMaster animation timing in `WordMaster.js`
- Use `requestAnimationFrame` for smooth animations

## Important Notes
- No server-side code - entirely client-side
- Font files never leave the browser
- Uses local copy of opentype.js (not CDN)
- MIT licensed
- Designed for font designers and typographers to showcase their work

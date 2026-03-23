# DESIGN

Working design system direction for Ontic. Future UI work should reference this file before introducing new visual patterns.

## Design language

The product should feel like a restrained editorial control surface:

- dark, near-black background
- monochrome-first palette built from neutral greys and white
- very limited accent usage, mostly for functional emphasis
- soft glass and elevated panel treatments
- large rounded controls, especially pill-shaped actions and tags
- clean sans-serif body typography with serif display moments
- fluid type sizing, tight display tracking, and generous composition spacing

## Core visual principles

### Color

- Use dark neutral surfaces rather than saturated backgrounds.
- Keep contrast high for key text and controls.
- Use accents sparingly and intentionally.
- Favor semantic tokens over hardcoded color values in components.

### Typography

- Sans-serif for body copy, controls, and interface chrome.
- Serif for hero and editorial display moments.
- Tight tracking on display headings.
- Fluid sizing for major headings and adaptable spacing across viewport sizes.

### Shape

- Rounded panels and cards should feel deliberate and substantial.
- Primary buttons and chip-like controls should lean pill-shaped.
- Borders should be subtle, often using translucent white.

### Surface treatment

- Panels should feel layered through translucency, gradients, and restrained shadow.
- Avoid noisy neon glows or overly colorful gradients.
- The interface should read as polished and controlled, not playful.

### Motion

- Motion should be understated and structural.
- Favor short hover/focus transitions over decorative animation.

## Implementation guidance

- Centralize tokens in the global stylesheet.
- Build reusable shell primitives for panels, cards, pills, buttons, labels, titles, and body copy.
- New components should consume semantic classes or tokens instead of ad hoc styling.
- If a new UI element cannot fit this system cleanly, update this file and the token layer deliberately rather than improvising.

## Current direction

The current shell implementation uses:

- tokenized semantic CSS variables in `src/index.css`
- reusable shell primitives for core surfaces and typography
- monochrome graph and panel chrome aligned to the editorial dark system

Future work should extend this system rather than reintroducing blue-toned or highly saturated shell styling.

---
version: alpha
name: Swiss International Frontend System
description: A strict International Typographic Style design system for integrating precise, grid-led, maintainable UI into frontend codebases.
colors:
  primary: "#FF3000"
  background: "#FFFFFF"
  foreground: "#000000"
  muted: "#F2F2F2"
  on-primary: "#000000"
  on-muted: "#000000"
typography:
  hero:
    fontFamily: Inter, Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 96px
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.06em
  display:
    fontFamily: Inter, Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 72px
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.05em
  heading:
    fontFamily: Inter, Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 40px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.04em
  body:
    fontFamily: Inter, Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter, Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.14em
rounded:
  none: 0px
spacing:
  grid-unit: 24px
  dot-unit: 16px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 96px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
  muted-surface:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.none}"
    padding: 16px 24px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: 16px 24px
  signal:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: 16px 0
---

# Swiss International Frontend System

## Overview

This system translates International Typographic Style into a practical frontend implementation method. It is for engineers and designers integrating a design system into an existing codebase without producing generic UI or one-off styling.

Before proposing or writing code, build a precise model of the current project: framework, router, styling layer, global CSS, token locations, component hierarchy, naming conventions, accessibility constraints, package size limits, and existing visual debt. The design work begins by understanding the codebase as it is.

Swiss style here means objective communication. The interface recedes so information becomes clear. Layout, type scale, contrast, borders, and negative space carry expression. Ornament is removed unless it helps structure information.

The result should feel intellectual, architectural, and brutally precise: like a museum exhibition, transit map, or well-engineered building. It should be flat, stark, modern, and permanent, with texture created by visible systems rather than decorative effects.

## Colors

The palette is intentionally severe.

- **Background** {colors.background} is pure white. It is the neutral canvas and should dominate.
- **Foreground** {colors.foreground} is pure black. It carries text, borders, structural lines, icons, and most primary UI.
- **Muted** {colors.muted} is light gray. It creates rhythm for secondary surfaces, sidebars, section bands, and pattern fields.
- **Primary** {colors.primary} is Swiss Red. It is a functional signal, not decoration. Use it for CTAs, section numbers, critical emphasis, focus states, and decisive hover feedback.
- **Structural black** {colors.foreground} defines borders, rules, icons, and text. Structure should be visible and honest.

Do not introduce extra brand colors. Red should remain scarce so it can pierce the monochrome system.

## Typography

Typography is the interface. Use Inter or a Helvetica-like grotesque sans-serif with high x-height and neutral voice.

- Headings and labels are uppercase by default.
- Large headings use 700–900 weight, tight tracking, and extreme scale.
- Body text uses 400–500 weight with objective, legible rhythm.
- Text is flush-left and ragged-right. Avoid static center alignment.
- Use mathematical scale relationships rather than arbitrary sizes.
- Massive type should function as composition, not only text.

Responsive type should stay bold: mobile hero text may compress to 56–64px, tablet to 72–96px, desktop to 128–160px where layout permits.

## Layout

The grid is law. Use visible structure: thick black borders, ruled sections, asymmetric columns, and patterned fields. The grid is not a loose guide; it is the skeleton of the information.

Preferred patterns:

- Mobile: single column, full-width CTAs, 4px borders remain intact.
- Tablet: two-column layouts begin; section headers may sit beside content.
- Desktop: asymmetrical grids such as 8:4, 7:5, and 5:7. Use sticky section labels where useful.

Spacing strategy:

- Use generous negative space in narrative and hero sections.
- Use dense rhythm in tables, stats, and structured information clusters.
- Reduce padding responsively but never make sections feel soft or cramped. Prefer p-12 on mobile, p-24 on desktop for major sections.

Ask the user focused scope questions before implementation when scope is unclear: redesign one component/page, refactor existing components into the system, or build new features entirely in this style.

## Elevation & Depth

No drop shadows. No glass. No neumorphism. No gradients to hide weak layout.

Depth comes from pattern, layering, and contrast:

- Grid pattern: 24×24px lines at about 3% opacity on white or muted surfaces.
- Dot matrix: 16×16px radial dots at about 4% opacity for section headers and sidebars.
- Diagonal lines: 45-degree repeated lines at about 2% opacity for directional energy.
- Noise texture: subtle SVG/fractal noise at about 1.5% opacity globally for paper-like warmth.

Never apply patterns to black surfaces or red areas. Patterns should reveal structure, not dominate content.

## Shapes

Everything is rectangular unless a geometric composition intentionally uses circles, squares, lines, or abstract Bauhaus forms.

- Radius is 0px.
- Borders are thick and visible: 2px minimum, 4px for primary section architecture.
- Shapes must align to the grid.
- Avoid soft rounded cards, floating panels, pill decoration, blobs, and vague organic shapes.

## Components

### Buttons

Primary buttons are rectangular black blocks with white uppercase text. Secondary buttons are white rectangles with black border and black text. Hover states are immediate color changes: black to red, white to red, or inversion. When red becomes a background, use black text for WCAG contrast. Do not scale buttons.

### Cards and Containers

Cards are containers defined by borders, not shadows. Backgrounds are white or muted gray. Padding is generous and uniform. Hover may invert the entire card to red or black, including text color.

### Inputs

Inputs are either underlined or strict rectangular boxes with thick borders. Focus changes border or ring to Swiss Red. No glow effects.

### Stats Cards

Stats use large numbers as graphic elements. On hover, numbers may scale from 1.0 to 1.05, plus icons rotate 0° to 90°, and background can snap from black to red.

### Feature Cards

Feature cards invert on hover from white to red or black. Arrows rotate from -45° to 0° to communicate direction.

### Testimonials

Testimonials remain restrained: -1px upward lift, border changes from black to red, quote text changes to red.

### FAQ Cards

FAQ cards use rotating plus icons and full background inversion. Motion should be mechanical and fast.

### Navigation

Desktop navigation can use vertical slide animation: original label slides up while red replacement slides in from below. Mobile navigation should collapse cleanly.

## Do's and Don'ts

- **Do** inspect the existing stack, tokens, global styles, component architecture, and constraints before coding.
- **Do** centralize tokens and map them to the repo's existing styling approach.
- **Do** match existing folder structure, naming, import patterns, and component conventions.
- **Do** use semantic HTML, accessible focus states, proper heading order, and minimum 44×44px touch targets.
- **Do** preserve or improve maintainability while adding visual character.
- **Do** make red functional: CTAs, focus, section numbers, warnings, and strong hover feedback.
- **Do** keep interactions immediate: duration-150 or duration-200, ease-linear or ease-out.
- **Do** respect `prefers-reduced-motion`.
- **Don't** add rounded cards, soft shadows, gradients, glass effects, or decorative color palettes.
- **Don't** center large text blocks unless content explicitly requires it.
- **Don't** thin borders on mobile. The system must stay bold at every breakpoint.
- **Don't** scatter one-off Tailwind classes when a reusable token, component, or utility should exist.
- **Don't** treat patterns as decoration. They must reinforce grid, print texture, or directional structure.

---
version: alpha
name: "AlgoryQR public menus"
description: "Brand-led QR menus that feel like the counter card of the venue, with calm ordering utility underneath."
colors:
  primary: "#D93F6B"
  background: "#FFF3F5"
  ink: "#4A1D2E"
  muted: "#8A5A6B"
  line: "#E9B8C6"
  mint: "#CDEFE0"
  butter: "#FFEBB0"
  lilac: "#E5DAFB"
typography:
  display:
    fontFamily: "Fredoka, system-ui, sans-serif"
  sans:
    fontFamily: "Nunito, system-ui, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "1rem"
  sm: "0.625rem"
  md: "0.875rem"
  lg: "1.5rem"
spacing:
  content-max: "35rem"
  page-gutter: "1.125rem"
  safe-bottom: "env(safe-area-inset-bottom, 0px)"
components:
  button:
    radius: "9999px"
    primary: "#D93F6B"
  card:
    radius: "1.25rem"
    surface: "#FFFFFF"
  dialog:
    radius: "1.75rem"
    overlay: "rgba(74, 29, 46, 0.5)"
---

# AlgoryQR public menus design system

## Overview

### Creative North Star

The Petek Waffle menu should feel like a cheerful counter card translated into a phone: soft paper, fruit-candy color blocks, rounded Fredoka headings, and a single strawberry-pink action color. The signature is the **Asistana sor** pill: a small chef-hat/sparkle invitation that opens the **Waffle asistanı** without interrupting the ordering flow.

### Product context and register

- **Audience and primary job:** Guests scanning a QR menu need to browse, customize, ask what fits their taste, and order quickly from a phone.
- **Target market(s) and evidence:** Turkish food-service QR ordering; the supplied Petek Waffle markdown and existing Turkish menu copy are the source evidence.
- **Locale(s) and language policy:** Turkish-first public menu copy; preserve the existing locale provider for translated menu content and keep action labels stable across the flow.
- **Usage scene:** One-handed mobile use at a café table or counter, with short attention windows and variable lighting.
- **Register:** Hybrid: playful brand expression in the menu and assistant, familiar utility in cart, options, and order confirmation.
- **Memorable signature:** Pink waffle-assistant pill with a chef-hat icon and one small butter-yellow sparkle.
- **Restraint:** Keep product names, prices, close controls, and order actions high-contrast and quiet.
- **Anti-references:** Do not resemble a generic SaaS chatbot, a dark gaming assistant, or a dense restaurant POS screen.
- **Token ownership/runtime mapping:** `src/components/menu-templates/petek-waffle/styles.ts` is the runtime source for `--pw-*` tokens; this file documents the same canonical values. Portaled assistant overrides live in `src/app/globals.css` under `.petek-waffle-chef-chat`.

## Colors

Strawberry pink (`#D93F6B`) is the expressive and primary action color. Cream pink (`#FFF3F5`) is the page field; ink (`#4A1D2E`) carries readable text; muted plum (`#8A5A6B`) carries supporting copy. Mint, butter, and lilac are category surfaces rather than semantic success/warning/error colors. Dark mode is derived in the Petek Waffle runtime stylesheet and must preserve contrast.

## Typography

Fredoka is reserved for menu titles, category headings, prices, and the assistant brand label. Nunito is the reading face for descriptions, controls, and helper copy. Both use system fallbacks so the menu remains legible while Google Fonts load. Turkish diacritics must remain intact; never force uppercase on guest-facing copy.

## Layout

The public menu is a centered, phone-first column with a `35rem` content ceiling and `1.125rem` gutters. Fixed bottom cart and assistant actions reserve safe-area space and must not cover one another. The assistant opens as a full-height, scroll-owned conversation surface on mobile and desktop, with the input anchored at the bottom.

## Elevation & Depth

Hierarchy comes from tinted surfaces, thin pink borders, and soft plum shadows. The assistant uses a translucent header/footer over a strawberry-cream field. Overlays dim with plum rather than black. Avoid heavy glass effects on product content; blur is reserved for sticky assistant chrome.

## Shapes

Buttons are pills; product and option surfaces use generous `1.25rem` to `1.75rem` rounding. Icon containers are small rounded squares or circles with the same pink/mint/butter surface vocabulary. Close controls remain circular or compact rounded squares and always retain a visible focus ring.

## Components

### Foundational visual states

Interactive controls expose hover, pressed, disabled, busy, and focus-visible states. Loading keeps control geometry stable. Reduced-motion users receive no decorative pulse or spring requirement.

### Buttons and actions

The assistant trigger says **Asistana sor** and uses the primary pink pill. The open assistant is named **Waffle asistanı**. Primary order actions use the same pink; neutral controls use cream/mint surfaces; destructive actions stay distinct.

### Forms and overlays

The assistant is a portaled full-screen conversation overlay with a sticky header, bounded message scroll region, and bottom input. Escape/close restores the menu. Product and cart sheets remain the canonical ordering overlays.

### Iconography

Lucide icons use a consistent outline stroke. The chef hat identifies the assistant; sparkle is a small accent, not the only label. Icon-only controls retain accessible names.

### Motion

Use short fade/slide transitions for opening and message arrival. Decorative sparkle/pulse is subtle and disabled under reduced motion. Never animate price or order controls in a way that changes their geometry.

### Content and data visualization

Copy is warm, direct, and Turkish. Actions say what happens: `Asistana sor`, `Sepeti gör`, `Sepete ekle`. Product recommendations must retain product name, price, and the existing quick-add behavior.

## Do's and Don'ts

- **Do:** Keep the assistant recognizable as part of the Petek Waffle menu, not as a separate SaaS product.
- **Do:** Preserve the existing product recommendation and cart behavior while changing presentation.
- **Don't:** Replace the explicit `Asistana sor` / `Waffle asistanı` labels with generic AI copy.
- **Don't:** Let the assistant trigger cover the cart bar, safe-area inset, or keyboard input.

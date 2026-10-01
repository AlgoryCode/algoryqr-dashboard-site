export const PETEK_WAFFLE_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600&display=swap");

  .petek-waffle-menu {
    --pw-bg: #fff3f5;
    --pw-ink: #4a1d2e;
    --pw-mute: #8a5a6b;
    --pw-line: #e9b8c6;
    --pw-acc: #d93f6b;
    --pw-p1: #ffd6e0;
    --pw-p2: #cdefe0;
    --pw-p3: #ffebb0;
    --pw-p4: #e5dafb;
    --pw-pill: #fff;
    --pw-th: rgba(255, 255, 255, 0.6);
    --lx-bg: var(--pw-bg);
    --lx-fg: var(--pw-ink);
    --lx-muted: var(--pw-mute);
    --lx-border: var(--pw-line);
    --lx-gold: var(--pw-acc);
    --lx-card: var(--pw-pill);
    background: var(--pw-bg);
    color: var(--pw-ink);
    font: 400 16px/1.45 "Nunito", system-ui, sans-serif;
    min-height: 100vh;
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    -webkit-font-smoothing: antialiased;
  }

  @media (prefers-color-scheme: dark) {
    .petek-waffle-menu:not([data-theme="light"]) {
      --pw-bg: #2a1620;
      --pw-ink: #ffe9ee;
      --pw-mute: #d2a5b4;
      --pw-line: #6b3d50;
      --pw-acc: #ff7a9f;
      --pw-p1: #4a2434;
      --pw-p2: #20443a;
      --pw-p3: #4d4023;
      --pw-p4: #3a3158;
      --pw-pill: #2a1620;
      --pw-th: rgba(255, 255, 255, 0.14);
    }
  }

  .petek-waffle-menu button { font: inherit; color: inherit; cursor: pointer; }
  .petek-waffle-menu .pw-wrap { max-width: 560px; margin: 0 auto; padding: 0 18px; }
  .petek-waffle-menu header { position: relative; overflow: hidden; padding: 46px 0 26px; }
  .petek-waffle-menu header .pw-wrap { position: relative; }
  .petek-waffle-menu h1 {
    margin: 0 0 14px;
    color: var(--pw-acc);
    font: 600 clamp(48px, 15vw, 70px)/0.92 "Fredoka", system-ui, sans-serif;
  }
  .petek-waffle-menu header p { margin: 0; max-width: 30ch; color: var(--pw-mute); }
  .petek-waffle-menu .pw-sp {
    position: absolute;
    width: 14px;
    height: 5px;
    border-radius: 3px;
    transform: rotate(var(--r));
  }
  .petek-waffle-menu nav {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--pw-bg);
    padding: calc(env(safe-area-inset-top, 0px) + 10px) 0 10px;
  }
  .petek-waffle-menu nav .pw-wrap {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .petek-waffle-menu nav button {
    flex: none;
    border: 0;
    border-radius: 99px;
    background: var(--pw-p1);
    padding: 8px 16px;
    font: 500 15px "Fredoka", system-ui, sans-serif;
  }
  .petek-waffle-menu nav button.on { background: var(--pw-acc); color: #fff; }
  .petek-waffle-menu section.pw-cat {
    margin: 18px 0 0;
    border-radius: 28px;
    padding: 22px 18px 10px;
  }
  .petek-waffle-menu .pw-c0 { background: var(--pw-p1); }
  .petek-waffle-menu .pw-c1 { background: var(--pw-p2); }
  .petek-waffle-menu .pw-c2 { background: var(--pw-p3); }
  .petek-waffle-menu .pw-c3 { background: var(--pw-p4); }
  .petek-waffle-menu h2 { margin: 0 0 4px; font: 600 28px/1.1 "Fredoka", system-ui, sans-serif; }
  .petek-waffle-menu .pw-sub { margin: 14px 0 0; color: var(--pw-acc); font: 500 15px "Fredoka", system-ui, sans-serif; }
  .petek-waffle-menu .pw-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 0;
    border-top: 1.5px dashed var(--pw-line);
    background: transparent;
    padding: 11px 0;
    text-align: left;
  }
  .petek-waffle-menu .pw-sub + .pw-item,
  .petek-waffle-menu h2 + div > .pw-item:first-child { border-top: 0; }
  .petek-waffle-menu .pw-item-open {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 12px;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    color: inherit;
  }
  .petek-waffle-menu .pw-th {
    display: grid;
    width: 58px;
    height: 58px;
    flex: none;
    place-items: center;
    border-radius: 18px;
    background: var(--pw-th);
  }
  .petek-waffle-menu .pw-th svg { width: 46px; height: 46px; }
  .petek-waffle-menu .pw-tx { min-width: 0; flex: 1; }
  .petek-waffle-menu .pw-name { font: 500 18px/1.2 "Fredoka", system-ui, sans-serif; }
  .petek-waffle-menu .pw-desc { margin: 2px 0 0; color: var(--pw-mute); font-size: 14px; line-height: 1.35; }
  .petek-waffle-menu .pw-rt { display: flex; flex: none; align-items: center; gap: 8px; }
  .petek-waffle-menu .pw-price {
    border-radius: 99px;
    background: var(--pw-pill);
    padding: 1px 11px;
    font: 500 15px "Fredoka", system-ui, sans-serif;
    white-space: nowrap;
  }
  .petek-waffle-menu .pw-add {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: var(--pw-acc);
    padding: 0 0 2px;
    color: #fff;
    font: 500 20px/1 "Fredoka", sans-serif;
  }
  .petek-waffle-menu .pw-add:disabled { opacity: 0.4; }
  .petek-waffle-menu footer { margin-top: 28px; color: var(--pw-mute); font-size: 13.5px; text-align: center; }
  .petek-waffle-menu .pw-bar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 6;
    display: none;
    padding: 0 18px calc(14px + env(safe-area-inset-bottom, 0px));
    pointer-events: none;
  }
  .petek-waffle-menu .pw-bar.on { display: block; }
  .petek-waffle-menu .pw-bar button {
    display: flex;
    width: 100%;
    max-width: 524px;
    margin: 0 auto;
    justify-content: space-between;
    border: 0;
    border-radius: 99px;
    background: var(--pw-acc);
    padding: 15px 22px;
    color: #fff;
    font: 500 17px "Fredoka", sans-serif;
    pointer-events: auto;
    box-shadow: 0 6px 18px rgba(217, 63, 107, 0.35);
  }
  .petek-waffle-menu .pw-ai-ask {
    position: fixed;
    right: 18px;
    bottom: calc(78px + env(safe-area-inset-bottom, 0px));
    z-index: 7;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    border: 1px solid rgba(255, 255, 255, .72);
    border-radius: 999px;
    background: linear-gradient(135deg, var(--pw-acc), #b83f91);
    padding: 10px 15px 10px 10px;
    color: #fff;
    font: 600 13px "Nunito", sans-serif;
    box-shadow: 0 10px 24px rgba(140, 45, 91, .28), 0 0 0 5px rgba(255, 214, 224, .45);
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .petek-waffle-menu .pw-ai-ask:hover { transform: translateY(-2px); box-shadow: 0 13px 28px rgba(140, 45, 91, .34), 0 0 0 6px rgba(255, 214, 224, .5); }
  .petek-waffle-menu .pw-ai-ask:active { transform: translateY(0) scale(.98); }
  .petek-waffle-menu .pw-ai-ask:disabled { opacity: 0; pointer-events: none; }
  .petek-waffle-menu .pw-ai-ask-icon { position: relative; display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: rgba(255, 255, 255, .22); }
  .petek-waffle-menu .pw-ai-ask-spark { position: absolute; right: -5px; top: -7px; width: 14px; height: 14px; color: var(--pw-p3); }
  .petek-waffle-menu .pw-ov {
    position: fixed;
    inset: 0;
    z-index: 8;
    background: rgba(74, 29, 46, 0.5);
    opacity: 0;
    visibility: hidden;
  }
  .petek-waffle-menu .pw-ov.on { opacity: 1; visibility: visible; }
  .petek-waffle-menu .pw-sheet {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9;
    max-width: 560px;
    max-height: 88%;
    margin: 0 auto;
    overflow: auto;
    border-radius: 28px 28px 0 0;
    background: var(--pw-bg);
    padding: 22px 20px calc(22px + env(safe-area-inset-bottom, 0px));
    transform: translateY(105%);
    visibility: hidden;
  }
  .petek-waffle-menu .pw-sheet.on { transform: none; visibility: visible; }
  .petek-waffle-menu .pw-x {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: var(--pw-p1);
    font-size: 20px;
  }
  .petek-waffle-menu .pw-big {
    display: grid;
    width: 100%;
    height: 150px;
    place-items: center;
    margin-bottom: 16px;
    border-radius: 22px;
    background: var(--pw-p1);
  }
  .petek-waffle-menu .pw-big svg { width: 112px; height: 112px; }
  .petek-waffle-menu .pw-sheet h3 {
    margin: 0 0 4px;
    padding-right: 44px;
    font: 600 26px/1.1 "Fredoka", sans-serif;
  }
  .petek-waffle-menu .pw-pr { margin: 0 0 10px; color: var(--pw-acc); font: 500 20px "Fredoka", sans-serif; }
  .petek-waffle-menu .pw-meta { color: var(--pw-mute); font-size: 14px; }
  .petek-waffle-menu .pw-cta {
    display: block;
    width: 100%;
    margin-top: 14px;
    border: 0;
    border-radius: 99px;
    background: var(--pw-acc);
    padding: 15px;
    color: #fff;
    font: 500 17px "Fredoka", sans-serif;
    text-align: center;
  }

  @media (max-width: 460px) {
    .petek-waffle-menu .pw-ai-ask {
      right: 14px;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      padding-right: 12px;
      font-size: 12px;
    }
  }

  /* Shared ordering panels: keep the app chrome in the same soft waffle language. */
  .petek-waffle-menu .pw-cart-header,
  .petek-waffle-menu .pw-options-header { border-bottom: 1px solid var(--pw-line); padding-bottom: 14px; }
  .petek-waffle-menu .pw-cart-title-icon,
  .petek-waffle-menu .pw-options-title-icon {
    display: inline-grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border-radius: 10px;
    background: var(--pw-p1);
    color: var(--pw-acc);
  }
  .petek-waffle-menu .pw-cart-description { color: var(--pw-mute); }
  .petek-waffle-menu .pw-cart-empty {
    position: relative;
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 170px;
    overflow-x: hidden;
    overflow-y: auto;
    border: 1px dashed var(--pw-line);
    border-radius: 22px;
    background: linear-gradient(145deg, var(--pw-p1), var(--pw-p4));
    text-align: center;
  }
  .petek-waffle-menu .pw-cart-empty-icon { display: grid; place-items: center; color: var(--pw-acc); }
  .petek-waffle-menu .pw-cart-empty-sparkle { position: absolute; top: 20px; right: 25%; color: var(--pw-acc); }
  .petek-waffle-menu .pw-cart-item {
    border-color: var(--pw-line);
    background: color-mix(in srgb, var(--pw-pill) 82%, var(--pw-p1));
    box-shadow: 0 8px 18px rgba(74, 29, 46, .07);
  }
  .petek-waffle-menu .pw-cart-item-icon {
    display: grid;
    width: 30px;
    height: 30px;
    flex: none;
    place-items: center;
    border-radius: 10px;
    background: var(--pw-p1);
    color: var(--pw-acc);
  }
  .petek-waffle-menu .pw-cart-options { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .petek-waffle-menu .pw-cart-option-pill { border-radius: 999px; background: var(--pw-p3); padding: 2px 7px; color: var(--pw-ink); font-size: 10px; line-height: 1.25; }
  .petek-waffle-menu .pw-cart-unit-price { margin-top: 5px; }
  .petek-waffle-menu .pw-cart-quantity button,
  .petek-waffle-menu .pw-options-quantity button { border-color: var(--pw-line); background: var(--pw-p1); color: var(--pw-ink); }
  .petek-waffle-menu .pw-cart-total { border: 1px solid var(--pw-line); border-radius: 16px; background: var(--pw-p3); padding: 13px 14px; color: var(--pw-ink); }
  .petek-waffle-menu .pw-cart-submit,
  .petek-waffle-menu .pw-options-submit { background: var(--pw-acc); color: #fff; box-shadow: 0 8px 18px rgba(217, 63, 107, .22); }
  .petek-waffle-menu .pw-options-sheet { box-shadow: 0 -12px 35px rgba(74, 29, 46, .18); }
  .petek-waffle-menu .pw-options-sheet > .pw-default-sheet-close { display: none !important; }
  .petek-waffle-menu .pw-options-sticky-header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin: -1rem -1rem 0;
    border-bottom: 1px solid var(--pw-line);
    background: color-mix(in srgb, var(--pw-bg) 92%, transparent);
    padding: 1rem 1rem .85rem;
    backdrop-filter: blur(14px);
  }
  .petek-waffle-menu .pw-options-sticky-header .pw-options-header { min-width: 0; flex: 1; border-bottom: 0; padding-bottom: 0; }
  .petek-waffle-menu .pw-options-sticky-header .pw-options-header [data-slot="sheet-title"] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .petek-waffle-menu .pw-options-close {
    display: grid;
    width: 36px;
    height: 36px;
    flex: none;
    place-items: center;
    border: 1px solid var(--pw-line);
    border-radius: 12px;
    background: var(--pw-p1);
    color: var(--pw-ink);
  }
  .petek-waffle-menu .pw-options-close:hover { border-color: var(--pw-acc); color: var(--pw-acc); }
  .petek-waffle-menu .pw-options-price { color: var(--pw-acc); font: 600 20px "Fredoka", sans-serif; }
  .petek-waffle-menu .pw-option-group { border: 1px solid var(--pw-line); border-radius: 20px; background: color-mix(in srgb, var(--pw-pill) 82%, var(--pw-p1)); padding: 12px; }
  .petek-waffle-menu .pw-option-group-heading { margin-bottom: 8px; }
  .petek-waffle-menu .pw-option-group-icon { display: grid; width: 29px; height: 29px; place-items: center; border-radius: 10px; background: var(--pw-p1); color: var(--pw-acc); }
  .petek-waffle-menu .pw-option-count { border-radius: 999px; background: var(--pw-p2); padding: 3px 8px; color: var(--pw-ink); white-space: nowrap; }
  .petek-waffle-menu .pw-option-button { border-color: var(--pw-line); background: var(--pw-bg); }
  .petek-waffle-menu .pw-option-button:hover { border-color: var(--pw-acc); }
  .petek-waffle-menu .pw-option-check { display: grid; width: 18px; height: 18px; flex: none; place-items: center; border: 1.5px solid var(--pw-line); border-radius: 6px; color: #fff; }
  .petek-waffle-menu .pw-option-check.is-checked { border-color: var(--pw-acc); background: var(--pw-acc); }
  .petek-waffle-menu .pw-options-note { border-color: var(--pw-line); background: var(--pw-pill); }
  .petek-waffle-menu .pw-options-quantity { border-radius: 999px; background: var(--pw-p1); padding: 4px; }
  .pw-success-overlay { overflow-y: auto; background: rgba(74, 29, 46, .58) !important; backdrop-filter: blur(4px); }
  .petek-waffle-menu.pw-success-card {
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    overflow: hidden;
    border-color: var(--pw-line);
    background: linear-gradient(160deg, var(--pw-pill) 0%, var(--pw-bg) 62%, var(--pw-p1) 100%);
    box-shadow: 0 20px 55px rgba(74, 29, 46, .28);
  }
  .petek-waffle-menu .pw-success-badge { position: relative; background: var(--pw-acc); color: #fff; box-shadow: 0 10px 24px rgba(217, 63, 107, .3); }
  .petek-waffle-menu .pw-success-badge::before,
  .petek-waffle-menu .pw-success-badge::after { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: var(--pw-p3); content: ""; }
  .petek-waffle-menu .pw-success-badge::before { top: 7px; right: 9px; }
  .petek-waffle-menu .pw-success-badge::after { bottom: 9px; left: 8px; background: var(--pw-p2); }
  .petek-waffle-menu .pw-success-kicker { background: var(--pw-p3); color: var(--pw-ink); }
  .petek-waffle-menu .pw-success-title { color: var(--pw-acc); font-family: "Fredoka", sans-serif; }
  .petek-waffle-menu .pw-success-subtitle,
  .petek-waffle-menu .pw-success-hint { color: var(--pw-mute); }
  .petek-waffle-menu .pw-success-order { background: var(--pw-p1); color: var(--pw-acc); }
  .petek-waffle-menu .pw-success-table { margin-left: 4px; background: var(--pw-p2); color: var(--pw-ink); }
  .petek-waffle-menu .pw-success-confirmed { background: var(--pw-p2); color: #24704f; }
  .petek-waffle-menu .pw-success-sparkle { position: absolute; color: var(--pw-acc); }
  .petek-waffle-menu .pw-success-sparkle-one { top: 34px; left: 23%; transform: rotate(-12deg); }
  .petek-waffle-menu .pw-success-sparkle-two { top: 78px; right: 20%; color: #d19b27; transform: rotate(15deg); }
  .petek-waffle-menu .pw-success-reward { background: var(--pw-acc); color: #fff; box-shadow: 0 8px 18px rgba(217, 63, 107, .22); }
  .petek-waffle-menu .pw-success-qr { border-color: var(--pw-line); background: #fff; padding: 8px; }
  .petek-waffle-menu .pw-success-link { color: var(--pw-acc); }
  .petek-waffle-menu .pw-success-done { border-color: var(--pw-line); background: var(--pw-pill); color: var(--pw-ink); }
  .petek-waffle-menu .pw-success-done:hover { border-color: var(--pw-acc); color: var(--pw-acc); }
  @media (max-height: 700px) {
    .petek-waffle-menu.pw-success-card { max-height: calc(100dvh - 1.25rem); padding: 20px 16px 16px; }
    .petek-waffle-menu .pw-success-badge { width: 64px; height: 64px; }
    .petek-waffle-menu .pw-success-badge svg { width: 32px; height: 32px; }
    .petek-waffle-menu .pw-success-sparkle-one { top: 18px; }
    .petek-waffle-menu .pw-success-sparkle-two { top: 48px; }
    .petek-waffle-menu .pw-success-kicker { margin-top: 12px; }
    .petek-waffle-menu .pw-success-title { margin-top: 8px; }
    .petek-waffle-menu .pw-success-subtitle { margin-top: 4px; }
    .petek-waffle-menu .pw-success-done { margin-top: 12px; }
  }
`;

export const PETEK_WAFFLE_CATEGORY_MARKS = ["🧇", "🍓", "🍫", "☕"] as const;

import { ALGORY_MENU_SANS } from "@/components/menu-templates/shared/algory-fonts";

import { MODERN_BISTRO_CATEGORY_MARKS, MODERN_BISTRO_STYLES } from "../modern-bistro/styles";

export const LILAS_DOUX_STYLES = `
  ${MODERN_BISTRO_STYLES}

  .lilas-doux-menu {
    --mb-bg: #fbf7fb;
    --mb-surface: #ffffff;
    --mb-muted-surface: #f6eaf3;
    --mb-fg: #2a1524;
    --mb-muted: #8a6a80;
    --mb-border: #f0d4e8;
    --mb-primary: #e0117a;
    --mb-primary-fg: #ffffff;
    --mb-accent: #c2185b;
    --mb-accent-soft: rgba(224, 17, 122, 0.12);
    --mb-brand-subtitle: #c2185b;
    --mb-cta: #e0117a;
    --mb-cta-soft: rgba(224, 17, 122, 0.12);
    --mb-card-footer: #ffffff;
    --mb-destructive: #ef4444;
    --mb-font: ${ALGORY_MENU_SANS};
    --mb-shadow: 0 12px 32px -16px rgba(224, 17, 122, 0.22);
    --mb-card-shadow: 0 8px 24px -12px rgba(42, 21, 36, 0.12);
    --lx-bg: var(--mb-bg);
    --lx-fg: var(--mb-fg);
    --lx-card: var(--mb-surface);
    --lx-card-fg: var(--mb-fg);
    --lx-card-muted: rgba(42, 21, 36, 0.72);
    --lx-muted: var(--mb-muted);
    --lx-border: var(--mb-border);
    --lx-gold: var(--mb-primary);
    --lx-gold-soft: var(--mb-accent);
    --lx-primary-fg: var(--mb-primary-fg);
    --lx-destructive: var(--mb-destructive);
    --lx-destructive-fg: var(--mb-fg);
    --lx-gradient-gold: linear-gradient(135deg, var(--mb-primary), #c77dff);
    background-color: var(--mb-bg);
    color: var(--mb-fg);
  }

  .lilas-doux-menu .mn-ai-ask-btn {
    background: linear-gradient(120deg, #e0117a, #c77dff, #e0117a);
    background-size: 220% 220%;
    box-shadow: 0 0 14px rgba(224, 17, 122, 0.22);
  }

  .lilas-doux-menu .mn-ai-ask-btn:hover {
    box-shadow: 0 0 18px rgba(224, 17, 122, 0.32);
  }
`;

export const LILAS_DOUX_CATEGORY_MARKS = MODERN_BISTRO_CATEGORY_MARKS;

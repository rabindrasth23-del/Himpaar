# Himpaar Design System

Brand color: **#5049EE** `rgb(80, 73, 238)` `oklch(0.524 0.238 276.2)` — sampled from `brand/source/himpaar-mark.png`.

## Color Tokens

| Token | OKLCH | Usage |
|-------|-------|-------|
| brand-50 | oklch(0.97 0.02 276) | Tinted backgrounds |
| brand-100 | oklch(0.93 0.04 276) | Hover states on light |
| brand-200 | oklch(0.87 0.08 276) | Borders, dividers |
| brand-300 | oklch(0.77 0.12 276) | Disabled text |
| brand-400 | oklch(0.65 0.16 276) | Secondary buttons |
| brand-500 | oklch(0.55 0.20 276) | Links, accents |
| brand-600 | oklch(0.524 0.238 276) | **Primary — the brand color** |
| brand-700 | oklch(0.42 0.20 276) | Hover on primary |
| brand-800 | oklch(0.33 0.16 276) | Active press |
| brand-900 | oklch(0.24 0.10 276) | Dark text on light |
| brand-950 | oklch(0.16 0.06 276) | Headings |

### Navy (dark sections)
| navy-950 | oklch(0.13 0.03 260) | Hero bg, footer |
| navy-900 | oklch(0.17 0.04 258) | Nav bg |
| navy-800 | oklch(0.22 0.05 256) | Cards on dark |

### Neutral (text, borders) — WCAG AA verified
| slate-50 | oklch(0.98 0.002 260) | Light section bg |
| slate-100 | oklch(0.95 0.005 258) | Card bg |
| slate-200 | oklch(0.90 0.01 256) | Borders |
| slate-400 | oklch(0.70 0.015 254) | Placeholder text |
| slate-500 | oklch(0.55 0.02 252) | Secondary text — **5.94:1 on white (AA)** |
| slate-700 | oklch(0.38 0.02 250) | Body text — **7.71:1 on white (AA)** |
| slate-900 | oklch(0.18 0.02 248) | Headlines — **15.4:1 on white (AAA)** |

### Semantic
| success | oklch(0.60 0.16 155) | |
| warning | oklch(0.70 0.16 80) | |
| danger | oklch(0.55 0.20 25) | |

## Typography

| Role | Font | Weight | Size/LH/Tracking |
|------|------|--------|-------------------|
| Display | Plus Jakarta Sans | 700 | 3.5rem / 1.1 / -0.02em |
| H1 | Plus Jakarta Sans | 700 | 2.5rem / 1.2 / -0.015em |
| H2 | Plus Jakarta Sans | 600 | 1.75rem / 1.3 / -0.01em |
| H3 | Plus Jakarta Sans | 600 | 1.25rem / 1.4 / 0 |
| Body lg | Inter | 400 | 1.125rem / 1.6 / 0 |
| Body | Inter | 400 | 1rem / 1.6 / 0 |
| Body sm | Inter | 400 | 0.875rem / 1.5 / 0 |
| Caption | Inter | 500 | 0.75rem / 1.4 / 0.02em |
| Code | JetBrains Mono | 400 | 0.875rem / 1.5 / 0 |
| Money | Inter tnum | 500 | tabular-nums for alignment |

## Spacing (8px base)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

## Radius
sm: 6px, md: 8px, lg: 12px, xl: 16px, full: 9999px

## Shadow
| xs | 0 1px 2px oklch(0 0 0 / 0.05) |
| sm | 0 2px 4px oklch(0 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.04) |
| md | 0 4px 8px -2px oklch(0 0 0 / 0.08), 0 2px 4px -2px oklch(0 0 0 / 0.04) |
| lg | 0 12px 24px -4px oklch(0 0 0 / 0.10) |
| glow | 0 0 40px oklch(0.524 0.238 276 / 0.15) |

## Motion
| fast | 150ms | hover, focus |
| normal | 250ms | fade, slide |
| slow | 500ms | section reveal |
| entrance | 800ms | hero stagger |
| ease-out | cubic-bezier(0.16, 1, 0.3, 1) |
| ease-spring | cubic-bezier(0.34, 1.56, 0.64, 1) |

All animation behind `@media (prefers-reduced-motion: no-preference)`.

## Honesty (AGENTS.md §9)
- Hero badge: "Sandbox preview. All payments, rates and documents are simulated. No real money moves."
- Footer disclaimer: same text.
- No claims: "faster", "secure", "live", "licensed", "official", "bank partner".
- Feature chips use facts only: Payment links, Settlement records, Export documents, Developer SDK.

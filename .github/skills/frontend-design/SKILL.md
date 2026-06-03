---
name: frontend-design
description: 'Create distinctive, production-grade frontend interfaces with high design quality. Use when: building web components, pages, artifacts, posters, applications (websites, landing pages, dashboards, React components, HTML/CSS layouts); styling or beautifying any web UI; generating creative, polished frontend code that avoids generic AI aesthetics.'
user-invocable: true
---

# Frontend Design — Distinctive UI Craft

Create interfaces that are **visually striking, cohesive, and memorable** — avoiding generic "AI slop" aesthetics. This skill guides you through design thinking and implementation of production-grade frontend code.

---

## When to Use

- Building any web UI: landing pages, dashboards, components, full applications
- Styling or redesigning existing interfaces
- Creating artifacts, posters, or visual web content
- Any task where visual design quality matters

---

## Design Thinking Process

Before writing any code, understand the context and commit to a **bold aesthetic direction**:

### 1. Context
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Choose an extreme — brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, or invent your own.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this **unforgettable**? One thing someone will remember.

### 2. Commit
Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is **intentionality**, not intensity.

---

## Frontend Aesthetics Guidelines

### Typography
- Choose **distinctive, characterful fonts**. Avoid generic picks (Inter, Roboto, Arial, system-ui).
- Pair a strong display font with a refined body font.
- Use variable fonts or font subsets to keep performance in check.

### Color & Theme
- Commit to a **cohesive palette** via CSS custom properties.
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- Vary between light and dark themes across different projects — don't converge on one default.

### Motion
- Use animations for purposeful effects and micro-interactions.
- CSS-only animations preferred for HTML projects.
- For React, use [Motion](https://motion.dev) when available.
- Focus on **high-impact moments**: staggered page-load reveals (`animation-delay`), scroll-triggering, surprising hover states.
- One well-orchestrated entrance is more delightful than scattered micro-animations.

### Spatial Composition
- Unexpected layouts: asymmetry, overlap, diagonal flow, grid-breaking elements.
- Generous negative space **or** controlled density — commit to one.
- Break the grid intentionally where it serves the design.

### Backgrounds & Visual Details
- Create atmosphere and depth beyond solid colors.
- Consider: gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays.
- Match effects to the aesthetic context.

---

## What NOT to Do (Anti-Patterns)

| ❌ Avoid | ✅ Instead |
|---|---|
| Inter, Roboto, Arial, system-ui stack | Distinctive, context-appropriate fonts |
| Purple gradients on white backgrounds | Cohesive palettes with clear intent |
| Same dark theme every time | Vary light/dark, warm/cool per project |
| Space Grotesk in every project | Rotate through different type families |
| Generic card-grid layouts | Unexpected compositions and asymmetry |
| Scattered micro-interactions | One well-orchestrated moment of motion |
| Flat backgrounds everywhere | Atmospheric depth and texture |
| Predictable centering | Intentional asymmetry and whitespace |

---

## Implementation

### Code Quality
- Write **working, production-grade** code — not mockups or prototypes.
- Full responsive support (mobile-first or desktop-first as the design demands).
- Accessible (semantic HTML, ARIA, keyboard navigation, contrast).
- Performance-conscious (lazy loading, font subsetting, minimal reflows).

### Matching Complexity to Vision
- **Maximalist** designs → elaborate code with extensive animations, layered effects, rich detail.
- **Minimalist / Refined** designs → restraint, precision, careful spacing/typography/subtle details.
- Elegance comes from **executing the vision well**, not alone from complexity.

### Tech Stack Decisions
- Pure HTML/CSS/JS for standalone pages and artifacts.
- React + framework-of-choice for component-based UIs.
- Use CSS custom properties for theming.
- CSS container queries for responsive components.
- PostCSS or CSS nesting for maintainable stylesheets.

---

## Workflow

1. **Clarify** the request — purpose, audience, constraints
2. **Design think** — choose aesthetic direction, commit to a concept
3. **Implement** — write production code with full attention to detail
4. **Review** — check against the aesthetics guidelines and anti-patterns
5. **Refine** — polish typography, spacing, motion, and micro-details

---
name: Impulse
description: Chrome side panel and blur overlay that show your own spending as friction, built to the category standard at full craft.
colors:
  surface: "#ffffff"
  well: "#f6f6f7"
  ink: "#1b1b1f"
  text: "#2e2e33"
  muted: "#6b6b75"
  line: "#e5e5e8"
  track: "#ececef"
  bar: "#c2c2c8"
  switch-off: "#8a8a94"
  accent: "#0a5651"
  accent-ink: "#ffffff"
  focus: "#0b57d0"
  surface-dark: "#1f1f23"
  well-dark: "#28282d"
  ink-dark: "#f2f2f4"
  text-dark: "#dcdce0"
  muted-dark: "#a0a0aa"
  line-dark: "#34343a"
  bar-dark: "#5c5c66"
  accent-dark: "#5fc8bf"
  accent-ink-dark: "#0d1f1d"
  focus-dark: "#8ab4f8"
  scrim: "rgba(250, 250, 251, 0.84)"
  scrim-muted: "#4f4f58"
  scrim-line: "#d6d6db"
  scrim-edge: "#b9b9c0"
  scrim-dark: "rgba(24, 24, 27, 0.82)"
  scrim-muted-dark: "#b4b4bd"
  scrim-line-dark: "#45454d"
  scrim-edge-dark: "#5c5c66"
typography:
  display:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  display-compact:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
  body:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  title:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  bar: "2px"
  sm: "4px"
  control: "6px"
  md: "8px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  row: "10px"
  lg: "12px"
  xl: "16px"
  section: "18px"
  footer: "24px"
components:
  switch:
    backgroundColor: "{colors.switch-off}"
    rounded: "{rounded.pill}"
    width: "28px"
    height: "16px"
  switch-checked:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    width: "28px"
    height: "16px"
  block-row:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    height: "32px"
  block-row-checked:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "32px"
  block-row-hover:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.control}"
    padding: "0 8px"
  breakdown-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.bar}"
    height: "3px"
  breakdown-fill:
    backgroundColor: "{colors.bar}"
    height: "3px"
  breakdown-fill-blocked:
    backgroundColor: "{colors.accent}"
    height: "3px"
  notice:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  overlay:
    backgroundColor: "{colors.scrim}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "16px"
  show-anyway:
    backgroundColor: "{colors.scrim}"
    textColor: "{colors.scrim-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "5px 14px"
  show-anyway-hover:
    textColor: "{colors.ink}"
---

# Design System: Impulse

## Overview

**Creative North Star: "Browser Chrome, Tuned"**

Impulse looks like it shipped with the browser. The side panel uses Chrome's own side-panel language: the system font at 13px, one neutral gray scale, 1px hairlines, flat 32px list rows, and Linear-level care with density and numbers. There is no themed world, no brand illustration, and no card grid. Chrome's side-panel header already shows the product name and icon, so the panel itself has no title.

The overlay is a calm friction screen in the style of Opal and one sec. A frosted neutral scrim covers the blurred post. On it sit one number at display size, one dry line of plain sentences, and a quiet "Show anyway" that is meant to feel like a small cost. It uses the same type stack and gray scale as the panel, so both surfaces read as one system even though one lives inside third-party pages.

Light and dark follow `prefers-color-scheme` on both surfaces. Motion is limited to state changes (150ms) and a deliberately slow 500ms fade when a post gets blurred.

**Key Characteristics:**
- System UI type, 13px base, tabular figures for every number.
- One neutral scale plus one accent, the icon teal, used only for selection and the switch.
- Hairlines and flat rows instead of cards and shadows.
- A single lead fact per surface, stated in plain sentences.
- The overlay is the same in every host: namespaced, contained, and quiet.

## Colors

A neutral gray scale carries almost everything. One deep teal marks what the user has chosen to block.

### Primary
- **Icon Teal** (accent; accent-dark in dark mode): the only accent. It fills the checked block checkbox (`accent-color`), the switch when it is on, and the bar of any blocked category in the breakdown. It never appears on the overlay.
- **Teal Ink** (accent-ink / accent-ink-dark): text and glyphs that sit on the accent.

### Neutral
- **Surface** (surface / surface-dark): the panel background.
- **Well** (well / well-dark): the sample-data notice and the row hover.
- **Ink** (ink / ink-dark): lead fact, section headings, checked rows, impact figures, overlay number.
- **Text** (text / text-dark): unchecked row labels and body text.
- **Muted** (muted / muted-dark): secondary lines, amounts, section meta, footer. Measured at 5.1:1 on white.
- **Hairline** (line / line-dark): section underlines and row dividers.
- **Track and Bar** (track, bar / bar-dark): the empty breakdown track and the fill of categories that are not blocked.
- **Switch Off** (switch-off): the switch track when off, 3.3:1 on white.
- **Focus Blue** (focus / focus-dark): the 2px focus ring, Chrome's own focus color.

### Overlay scrim
- **Frosted Scrim** (scrim / scrim-dark): translucent neutral over a 14px blur of the post.
- **Scrim Muted** (scrim-muted / scrim-muted-dark): the dry line and the "Show anyway" label, 7:1 on the scrim.
- **Scrim Line and Edge** (scrim-line, scrim-edge and their dark pairs): the hairline and 2px bottom edge of "Show anyway".

### Named Rules
**The One Accent Rule.** Teal means "you chose to block this." It marks selection and the on state, nothing else. No second accent, no teal on the overlay.

**The Monochrome Exit Rule.** "Show anyway" uses only scrim grays. It never gets the accent, a fill, or any color that invites a click.

## Typography

**Display Font:** system-ui (with -apple-system, "Segoe UI", sans-serif)
**Body Font:** the same stack

**Character:** The browser's own face, so the panel feels native. Hierarchy comes from size and weight steps (12, 13, 22, 40) and ink against muted, not from a second family.

### Hierarchy
- **Display** (600, 20px, line-height 1.2, -0.02em, tabular): the overlay's dollar figure. Steps down to **Display Compact** (16px) when the host is 220px wide or narrower.
- **Headline** (600, 22px, 1.2, -0.01em, tabular, balanced wrap): the panel's lead fact, e.g. "$428 on food".
- **Body** (400, 13px, 1.45): row labels, the impact line, the overlay's dry line.
- **Title** (600, 12px): section headings ("Block", "Last 30 days", "This month").
- **Label** (400, 12px): the line under the lead fact, section meta ("1 of 3", data source), hints, notice, footer, the "Show anyway" label.

### Named Rules
**The Tabular Figures Rule.** Every amount and count uses tabular numerals so columns and live updates do not shift.

**The Plain Sentence Rule.** Copy is plain sentences. No fragments separated by periods, no late-night count in the panel, no estimate blurb. The estimate is labeled with the words "est. saved" right next to its figure.

## Layout

The panel is a single column with 16px side padding (20px at the bottom) and a 280px minimum width. It reads from top to bottom:

1. A lead row with the fact and its subline on the left and the switch right-aligned, top-aligned to the fact.
2. Sections separated by 18px. Each opens with a header row: the heading on the left, meta on the right, baseline-aligned, 6px above a hairline.
3. Block rows are flat flex rows at least 32px tall: a 14px checkbox, the label (flexible), then the amount. 10px gap. A hairline after each row.
4. Breakdown rows are a two-column grid (label, amount) with a 3px bar spanning the full width below. Gaps are 4px vertical and 12px horizontal, with 7px top and 8px bottom padding.
5. Impact is one inline line of three figures separated by middle dots. Each figure stays on the same line as its label.
6. A 12px footer 24px below everything else.

The spacing steps actually used are 2, 4, 6, 8, 10, 12, 16, 18 and 24px. When blocking is off, the block list, breakdown and impact fade to 55% opacity but stay editable.

The overlay is a centered flex column with 6px gaps and 16px padding. It is a size container, so on hosts 220px wide or narrower it drops the question line, shrinks the number, and tightens the button.

## Elevation & Depth

Flat. Depth comes from tones and hairlines, not shadows. The only shadow in the system is the switch thumb (`0 1px 2px rgb(0 0 0 / 0.2)`). On the overlay, depth comes from a 14px blur under a translucent scrim, inside the host's own stacking context (`isolation: isolate`) so it can never rise above the site's modals.

### Named Rules
**The Hairline Rule.** Separate things with a 1px hairline or a well tone. Don't use cards, borders on all four sides, or shadows to group.

**The Contained Overlay Rule.** The overlay lives inside each blurred host's stacking context. Every overlay class is `ss-` prefixed, starts from `all: initial`/`all: unset`, and uses `!important`, so host pages are never affected.

## Shapes

Small, quiet corners. 8px on wells (the notice). 6px on interactive surfaces (row hover, "Show anyway"). 4px on the focus ring. 2px on the bar track. The switch track is a full pill and the thumb is a circle. Breakdown bars are 3px tall.

## Components

### Switch
- **Character:** Chrome-style, small and precise.
- **Shape:** 28 x 16px pill track with a 12px white circular thumb, inset 2px, with the system's only shadow.
- **States:** Off uses the Switch Off gray. On uses the accent, and the thumb moves 12px (150ms, ease-out `cubic-bezier(0.23, 1, 0.32, 1)`). A 12px muted "On"/"Off" label sits to its left. No thumb transition under reduced motion.

### Block rows (checkbox list)
- **Style:** Flat rows at least 32px tall with a hairline below. The checkbox is tinted by the accent through `accent-color`.
- **Checked:** The label turns ink at weight 500 and the amount turns ink.
- **At the cap:** With 3 groups checked, the other rows are disabled (muted, not-allowed cursor). The header meta reads "3 of 3" and a muted hint reads "Uncheck one to pick another."
- **Hover (pointer devices only):** a well background with 6px corners that extends 8px past the row on both sides.

### Breakdown rows
- **Style:** Label and amount above a 3px track. The fill is the neutral bar color, and the accent when the category belongs to a blocked group (its label and amount turn ink too). The fill color changes over 150ms.

### Notice
- **Style:** A well with 8px corners, 8 x 10px padding and 12px ink text. It only appears when the panel shows built-in sample data, and the section meta reads "Sample data" instead of the data source.

### Overlay
- **Style:** A frosted scrim over the blurred post (14px blur, no pointer events, inert children, video paused). Inside, centered: the number in display type, a muted dry line ("spent on food in the last 30 days" then "Still want to see this?"), and "Show anyway".
- **Motion:** The scrim fades in over 500ms and the blur eases in over 500ms (`cubic-bezier(0.23, 1, 0.32, 1)`). This is intentionally unhurried. The fade only changes opacity, so it is safe under reduced motion. The blur transition only runs when motion is allowed.
- **Accessibility:** `role="group"` with an aria-label naming the group. The button's aria-label names what it reveals. After "Show anyway" is used, focus moves to the revealed post.

### Show anyway (signature)
- **Character:** Deliberately unattractive and monochrome. Clicking it should feel like a small cost.
- **Shape:** 6px corners, a 1px scrim-line hairline on top and sides, and a 2px scrim-edge bottom edge instead of a shadow.
- **Color:** The background matches the overlay (transparent over the scrim). The label is scrim-muted, 12px, weight 400.
- **Hover:** The label turns ink and the bottom edge darkens to scrim-muted. **Press:** scales to 0.96 over 150ms when motion is allowed. **Focus:** a 2px focus ring offset by 2px.

## Do's and Don'ts

### Do:
- **Do** use the system font stack at 13px with tabular figures for every number.
- **Do** keep the icon teal for selection and the on state only.
- **Do** separate content with 1px hairlines and flat 32px rows.
- **Do** lead each surface with one fact in plain sentences, and label estimates with "est. saved."
- **Do** follow `prefers-color-scheme` on both panel and overlay, using the paired dark tokens.
- **Do** cap blocked groups at 3 and show the count in the Block header.
- **Do** fade overlays and blur in over 500ms. Use 150ms for state changes.
- **Do** prefix every overlay class with `ss-` and keep it inside the host's stacking context.

### Don't:
- **Don't** add an "Impulse" heading inside the panel. Chrome's side-panel header already shows the name and icon.
- **Don't** give "Show anyway" color, a fill, a shadow, or a primary-button look.
- **Don't** use cards, metric tiles or a hero-metric layout. Impact stays on one inline line.
- **Don't** write period-separated fragments, a late-night count, or an estimate blurb in the panel.
- **Don't** add a second accent or a themed palette. The icon's colors are not binding for the UI.
- **Don't** show sample data without the notice and the "Sample data" label.

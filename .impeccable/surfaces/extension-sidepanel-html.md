---
version: 1
slug: "extension-sidepanel-html"
primary_target: "extension/sidepanel.html"
related_targets: ["extension/content.css"]
---

# Side panel + blur overlay

Scope: extension/sidepanel.* (Chrome side panel) and extension/content.css + overlay markup in content.js. Mode: Operate.
Audience: impulse spenders checking or adjusting what is blocked, mid-browse, often late at night; judges in a 2-minute demo.
Task: see what you spend, choose up to 3 groups to block, toggle blocking, see impact. Overlay: one fact, one quiet way out.
Constraints: MV3, no frameworks, overlay namespaced (ss-) inside each host's stacking context, monochrome "Show anyway", max 3 groups, sample-data notice, "Not financial advice".

## Direction contract

THESIS: The panel reads as if it shipped with Chrome and was tuned by Linear; the overlay is an Opal-style friction screen with one fact. Refuses a themed world, card grids, and the hero-metric template.

OWN-WORLD: System UI stack, 13px base, one neutral gray scale (#fff surface, #f6f6f7 wells, #1b1b1f ink, #6b6b75 secondary), 1px #e5e5e8 hairlines, 8px radius on wells, 32px list rows, icon teal #0a5651 as the single accent for selection and the switch. Overlay: frosted neutral scrim, light and dark.

STORY: The user sees what is blocked and what it cost, changes a checkbox, sees the feed respond, trusts the numbers because each states its source.

FIRST VIEWPORT: One row: lead fact "$428 on food" with "23 purchases in the last 30 days" beneath (user copy: plain sentences, no late-night count), switch right-aligned. Then a "Block" section: flat list rows (checkbox, group, amount), 3-of cap in the section header. Then breakdown rows with thin bars. Impact as one inline line of three figures, not tiles; no estimate blurb (user removed it).

FORM: category standard (canon), chosen over the roll; seed:9ef63afc47485ce8. Signature interaction: the overlay leads with the number at display size, one dry line, and a quiet "Show anyway"; checking a group updates the lead fact live.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

---
target: src/components/layout/Sidebar.tsx
total_score: 25
max_score: 32
na_heuristics: 9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-21T14-00-55Z
slug: src-components-layout-sidebar-tsx
---
### Design Specificity Verdict

**LLM assessment**: The component attempts to follow the Illuminated Manuscript aesthetic, utilizing the --bg-page / --text-muted tokens and a custom layout. However, it falters in strict consistency by inventing new styles (for inputs and buttons) instead of reusing DESIGN.md definitions.

**Deterministic scan**: The CLI scan returned 0 findings. No false positives.

**Visual overlays**: Skipped. No browser automation or injection tools were available in the current environment.

### Overall Impression
The sidebar functionally excels—especially with its keyboard navigation—but suffers from visual inconsistencies. It invents new component styles instead of relying on the established design tokens, and features a subtle but disorienting typographic hierarchy inversion.

### What's Working
1. **Power-User Navigation:** The custom arrow-key event listener is a fantastic accelerator for keyboard-heavy users.
2. **Category Highlighting:** The active category row styling (rust bottom border + rust icon/text) matches the DESIGN.md perfectly and provides clear location context.

### Priority Issues

**[P1] Hierarchy Inversion in Navigation Text**
* **What**: The 	ypeRow (category folder) uses --fs-body-lg (17px), while the child olioLink (items inside the folder) uses --fs-subtitle (18px).
* **Why it matters**: Child elements shouldn't be larger than their parent containers. It confuses visual parsing and breaks the structural hierarchy.
* **Fix**: Change olioLink to use --fs-body (16px) or --fs-body-sm (15px) for a denser, properly subordinated list.
* **Suggested command**: /impeccable typeset src/components/layout/Sidebar.tsx

**[P2] Invented Input and Button Styles**
* **What**: The "+ New entry" button is unstyled muted text, and the inline input uses a novel order-bottom style.
* **Why it matters**: DESIGN.md explicitly defines an "Add" button with a rust outline for creation, and specific input styles. Inventing one-off styles fragments the design system and makes the app feel like a draft.
* **Fix**: Update the "+ New entry" button to use the utton-add token style (or an eyebrow variant) and use the standard input-text styling.
* **Suggested command**: /impeccable polish src/components/layout/Sidebar.tsx

**[P2] Cryptic Submit Button**
* **What**: The "Confirm" button for a new entry is just the ↵ text character.
* **Why it matters**: Users might not immediately recognize this as a clickable submit button. It fails the "Recognition Rather Than Recall" heuristic.
* **Fix**: Replace it with a clear "Add" or "Create" label, or a standard icon (like a plus or checkmark).
* **Suggested command**: /impeccable clarify src/components/layout/Sidebar.tsx

### Persona Red Flags
* **Jordan (First-Timer)**: Will struggle to understand how to confirm a new entry due to the cryptic ↵ button. They might press Enter naturally, but the UI affords no clear alternative.
* **Sam (Accessibility)**: The inline input has a focus state (order-bottom-color: var(--accent-rust)), but the 
ewEntryConfirm button might lack sufficient focus visibility if tabbed to.

### Minor Observations
* The .typeRow active state uses a bottom border. This creates a slight visual jump if the padding isn't calculated to absorb the 1px border. (Though order-bottom: 1px solid transparent on the resting state prevents this jump, which is excellent attention to detail).

### Questions to Consider
* If the sidebar is meant for rapid navigation, why is the "+ New entry" button pushed all the way to the footer instead of being contextually next to the active category?

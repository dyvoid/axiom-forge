# 18. Folio Cover Image

**Date:** 2026-08-21
**Status:** Accepted — implemented 2026-09-10

## Context

No image field type, image-recognition syntax, or static file serving exists anywhere
in the project today. A Wikipedia-infobox-style photo — one image prominently shown for
a folio, and as a thumbnail elsewhere the folio is referenced — was raised as a
high-value, widely-wanted gap.

This must stay optional: no folio should be required to have an image, and existing
projects need no schema change to keep working. It must also stay Obsidian-compatible
and, per [ADR-0007](0007-consolidate-folio-integrity.md)'s folio walker, is
already compatible by construction — `fileIO.ts` already filters to `.endsWith('.md')`
when scanning folders, so image files are silently ignored by the existing scan with no
changes needed there.

Inline, in-body images (embedded within a section's content, potentially multiple per
folio) are a related but distinct feature, explicitly deferred — this ADR covers only
the single per-folio cover image.

The original proposal derived the cover from *file presence*: an image co-located with
the `.md` file, same basename, no in-file reference. Review rejected that twice over.
First, file presence is invisible to Obsidian's renderer, so the two tools would disagree
about what a folio looks like. Second, the same-basename pairing was only ever a
resolution mechanism — once the embed line became the source of truth, the location
constraint lost its purpose, and keeping it would forbid the thing a shared asset folder
is for: many folios referencing one image.

## Decision

A folio's cover image is an **image embed line in the preface** — the region between the
H1 and the first `##` section, which `splitSections` already captures and round-trips
losslessly. The embed is the single source of truth:

- Both Obsidian's wikilink embed (`![[Odysseus.png]]`) and standard Markdown image syntax
  (`![](Odysseus.png)`) are recognized on read. The app always *writes* wikilink embeds.
- The embed may reference **any vault-relative image path** — a bare filename
  (`![[Odysseus.png]]`, resolved vault-wide by shortest unique path, Obsidian's behaviour)
  or an explicit one (`![[Images/odysseus_bust.png]]`). No co-location requirement.
- Obsidian's size suffix (`![[Odysseus.png|300]]`) is preserved verbatim and ignored by
  the app's rendering — the infobox controls its own size, Obsidian keeps its sizing.
- The parser extracts the first image embed in the preface into a structured
  `coverImage` field on `ParsedFolio`; the serializer writes it back as the first
  preface line. Any further embeds remain preface content (deferred to inline images).
- **Images are shareable:** any number of folios may embed the same file.
- Uploads: the app writes new image files to an `Images/` folder at the project root
  by default.
- Entirely optional: a folio with no embed renders with none — no schema warning, no
  requirement anywhere, no `schema.json` change for any existing project.
- **Read-view presentation:** the image renders at the **top of the meta column**,
  above the field rows — Wikipedia-infobox placement, inside the existing two-column
  top block, no new layout vocabulary. Natural proportions (`max-width: 100%`, no
  forced crop), framed by a `1px solid var(--border)` hairline with a small `--bg-page`
  inner padding, no radius or shadow. An italic `--fs-meta` caption in
  `--text-secondary` renders only when the embed carries alt text (standard Markdown
  syntax); wikilink embeds render uncaptioned. Images render exactly as authored — no
  sepia or filter treatment; the hairline frame alone carries the print feel.
- Other surfaces render it at thumbnail size, and only on **preview cards** (search
  dropdown, Linked Mentions — the "what is this thing?" idiom). Index lines stay
  text-only: the eye is scanning an alphabetical column, and images there are noise
  that breaks the single-line rhythm.
- A folio whose embed points at a missing image renders **with no image at all** —
  no placeholder, no broken-image glyph — and the missing-file warning surfaces in the
  existing schema-warnings block, consistent with how broken folio wikilinks behave.
- **Rename is decoupled:** renaming a folio never touches image files — the embed
  references the image by its own path, not the folio's name.
- **Delete asks:** deleting a folio prompts whether to also delete the image file its
  embed references. Declining leaves the image in place (possibly orphaned); accepting
  may break embeds in *other* folios if the image was shared — those surface as
  broken-link warnings, repairable by hand or in Obsidian. No refcounting or embed
  indexing is required for this.
- The server needs a new static-file-serving surface for images that does not exist
  today: a dedicated endpoint under the existing `/api` prefix —
  `GET /api/folios/:folder/:name/image` resolves the folio's cover embed to its vault
  path and serves it; `PUT`/`DELETE` on the same route for upload and removal. Serving
  arbitrary vault-relative paths requires path-traversal guarding.
- The extension allowlist (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) governs uploads;
  it is a validation rule, not a resolution ranking — the embed names the exact file.
- Embeds outside the preface (inside a prose section) are inline content, not a cover —
  the deferred inline-images feature. No warning is emitted for them yet; the wikilink
  renderer will need the `!` prefix handled as part of that work.

## Consequences

- **Positive:** Axiom Forge and Obsidian disagree about nothing on disk — the embed is
  native Obsidian syntax in a legal position, and both render it at the top of the note.
  Images can be shared across folios and reorganized freely (renaming or moving an image
  inside Obsidian auto-updates every embed pointing at it). Folio rename is purely a
  folio operation, and delete is a single prompt with no index to maintain. Fully opt-in
  via the embed line, so no migration for existing projects.
- **Negative:** First item in the current backlog that isn't a single-subsystem change
  — touches embed parsing, static serving, upload UI, and folio delete, in one feature.
  Deleting a shared image can silently break other folios' embeds (warnings only, by
  design). Serving arbitrary vault paths needs path-traversal guarding. The `Images/`
  default is a convention, not a rule: files added or moved outside the app rely on
  Obsidian's own link-updating to keep embeds valid.
- **Neutral:** Inline in-body images and any thumbnail-generation/caching concerns at
  scale are explicitly out of scope here.

## Implementation

Cover embed parsing and serialization live in `shared/parser.ts`; path resolution, upload, and
deletion live behind `ProjectStore` and `server/fileIO.ts`; the client renders `CoverImage` in the
meta column and adds the upload control to the edit view. Index records carry cover metadata so
preview cards can request thumbnails without fetching each full folio.

Two details refine the Decision. Existing standard Markdown embeds remain standard Markdown when
a folio is saved so the parser's lossless round-trip contract is preserved; only images added by
the app are written as wikilink embeds. Upload and folio save are consecutive requests rather than
one filesystem transaction, so a save conflict after a successful upload can leave an unreferenced
file in `Images/`; that is harmless project content and can be removed in Obsidian.

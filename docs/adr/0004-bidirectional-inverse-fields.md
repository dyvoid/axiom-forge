# 4. Bidirectional / Inverse Fields

**Date:** 2026-06-05 (revised 2026-07-30)
**Status:** Accepted — not yet implemented. See Open Items below.

> **Note:** Revised 2026-07-30 from *write-through* to *display-first*. The original decision
> had every save silently patch the inverse field on all referenced folios, using the batched
> flush from ADR-0003. That is replaced by: derive inverse relationships for display from the
> link index, and write them only on explicit user confirmation, as ordinary single-file saves.
> The dependency on ADR-0003 is removed — see [ADR-0010](0010-multi-file-write-safety.md), which
> supersedes it.

## Context

`wikilink` and `wikilink-list` fields are one-directional: the value is stored only in the folio
that declares it. In `fall-of-troy`, Athena's `Mortal Champions` lists Odysseus and Odysseus'
`Divine Patron` names Athena — the same relationship, entered twice by hand, with nothing keeping
the two in step.

The backlinks system already knows about these relationships: "Linked Mentions" renders every
folio that links to the current one. What it cannot do today is say *how* it links — the index
stores each outgoing link as a bare `{ folder, name, alias }` with no record of which section or
field it came from. So the panel can report "Athena links here" but not "Athena lists you as a
Mortal Champion."

Surveying the relationships actually present in `fall-of-troy/schema.json` turns up four distinct
topologies, which any design has to handle:

1. **Cross-type pairs, both sides declared.** `Human.Divine Patron` ↔ `God.Mortal Champions`;
   `Human.Allegiance` ↔ `Faction.Key Members`; `Event.Location` ↔ `Location.Connected Events`.
2. **Symmetric / self-inverse.** `Human.Spouse` ↔ `Human.Spouse`. `Allies` and `Enemies` likewise.
   The inverse of the field is the same field on the other folio.
3. **Same type, two different fields.** `Event.Preceding Events` ↔ `Event.Succeeding Events`.
4. **One-sided — no inverse field exists.** `Human.Children` has no `Parents` field to pair with.
   Nor do `Faction.Leader`, `Location.Notable Residents.Characters`, or
   `Artifact.Current Owner`. For these, no write-through design is possible at all without first
   adding fields to `schema.json` — a change `AGENTS.md` flags as requiring human review because
   it can invalidate existing Markdown.

Two further complications fall out of the same survey:

- **Partial type coverage.** `Human.Allies` targets both `Humans` and `Gods`, but the `God` type
  declares no `Allies` field. An inverse annotation valid for one target type can be
  unsatisfiable for another.
- **Section-level lists cannot be addressed.** `Connected Events` is a section-level
  `wikilink-list` on Human, God, Location, Faction, and Artifact — links hang off the section with
  no inner field name. On Event, `Connected Events` is a section *containing* fields. The
  originally specified `"<SectionName>.<FieldName>"` path cannot name the section-level form, and
  the `Divine Patron` ↔ `Mortal Champions` pair crosses precisely that boundary (a field on one
  side, a section-level list on the other).

The original write-through decision also conflicts with two project guarantees. Obsidian
compatibility means any invariant maintained only by Axiom Forge will be violated by the other
editor: delete the link in Obsidian and the inverse field it wrote stays behind, with nothing to
detect or repair the disagreement. And making every save rewrite files the user did not open
multiplies the blast radius of any serializer imperfection from one file to N, in a tool whose
premise is that the files on disk are the truth.

## Decision

Treat inverse relationships as **derived by default, written only on request.**

**1. Schema annotation.** `FieldDef` and section-level `SectionDef` gain an optional
`inverse: string`. Two path forms, so both shapes are addressable:

- `"<SectionName>.<FieldName>"` — a field inside a section.
- `"<SectionName>"` — a section-level typed list.

A path naming the annotated field itself declares a symmetric relationship (topology 2). This is
backward-compatible: schemas without `inverse` are unaffected, and topology 4 fields simply carry
no annotation and get no inverse treatment.

**2. Link provenance in the index.** `walkFolioLinks` already yields a `FolioLinkLocation`
(`{ section, field? }`) for every link; `extractAllLinks` currently discards it. Retain it, and
store links in the index as link-plus-location. This is the only data change the feature needs,
it is confined to already-cached metadata, and it adds no disk reads — the backlinks lookup
remains an in-memory scan.

**3. Display.** Implied relationships render in their own zone, never merged into the row of the
stored field. Concretely, the Linked Mentions panel becomes grouped by incoming location:
structured groups labelled by the source field (`Mortal Champions ← Athena`), and a separate
group for links found in prose, which have no field and can never imply a value. A stored field
and its implied counterpart therefore always render distinctly, so a contradiction — `Divine
Patron` says Apollo while Athena claims the same champion — is visible rather than reconciled
behind the user's back.

**4. Explicit writes, two entry points, both ordinary single-file saves.**

- **Push, at save time.** After saving a folio whose annotated field gained a link, offer to set
  the inverse on the target: *"Also set Odysseus' Divine Patron to Athena?"* Confirming issues a
  second, normal `PUT` for that folio. Two sequential single-file saves, each with its own mtime
  check — not an atomic multi-file transaction.
- **Pull, on the target.** An affordance beside an implied value writes it into the stored field.
  A single-file save of the folio being viewed.

Nothing is written without confirmation, and no new save machinery is introduced.

**5. Schema-load validation.** An `inverse` path must resolve to a field or section-level list
that exists on *every* type the annotated field can target, and the two sides' cardinalities must
be compatible. Unsatisfiable annotations are reported at load like any other schema error, rather
than failing silently at save time.

## Consequences

- Works for all four topologies. Topology 4 (`Children`, `Leader`, `Current Owner`) gets useful
  display without any `schema.json` change, which write-through could not offer at all.
- Derived values cannot go stale, because nothing is stored. Editing either side in Obsidian
  changes what is displayed on the next read, with no possibility of the two files disagreeing.
- Symmetric fields need no cycle detection. Write-through would have to guard against A writing
  B writing A; here a confirmed write touches exactly one file and stops.
- Cardinality mismatches degrade gracefully. If two Gods each claim the same champion, a
  single-valued `Divine Patron` shows both candidates as implied and the user picks. Write-through
  would have had to silently overwrite one.
- Failure is visible and recoverable. If the second save of a push is rejected as stale, the
  first is already durable and the user is told which file changed — instead of a partially
  applied atomic batch.
- `FieldDef` and `SectionDef` gain an optional property; `FolioIndexRecord`'s link list gains a
  location per entry. No on-disk format change, so `docs/data-model.md` needs updating only for
  the `inverse` annotation, and only once this is implemented.
- Round-trip serializer fidelity stops being critical to this feature. Writes are single-file and
  user-initiated, the same risk profile as any manual edit.
- **The ADR-0003 dependency is removed.** Display runs on the link index the store already holds;
  the writes are existing single-file saves. Neither a content cache nor a batched flush is
  required.

## Open Items

Unresolved, and to be settled before this is built:

- **Deletion.** Deleting a folio leaves stored inverse values pointing at nothing. Existing
  broken-link detection surfaces this on the next save of the affected folio; whether anything
  should act proactively is undecided.
- **Dangling targets.** Odysseus' `Spouse` names `Penelope`, and Athena's champions include
  `Diomedes`; neither file exists. Implied values and write offers must skip targets with no
  folio, rather than offering to write a link into a file that isn't there.
- **Push-prompt scope.** Whether the save-time offer covers links *removed* from an annotated
  field (offering to clear the inverse), or additions only.

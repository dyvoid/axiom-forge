# CONTEXT

The domain vocabulary of Axiom Forge: what each term means, and where it lives in the code. It
exists so that names in code, docs, ADRs, and the UI stay the same names.

Two rules keep this file honest, matching [Documentation Discipline](docs/documentation.md):

- **A term enters this file when the code uses it**, not when it is proposed. Names that appear
  only in a `Proposed` ADR are not vocabulary yet — they are a suggestion, and they move here on
  the commit that implements them.
- **This file names things; it does not specify them.** The on-disk contract is
  [Data Model](docs/data-model.md), the system shape is [Architecture](docs/architecture.md).
  Where a term has a contract, this file links to it rather than restating it.

## The core noun

**Folio** — one entry in the encyclopedia, stored as one Markdown file on disk. The central noun
of the whole system: `ParsedFolio`, `FolioIndexRecord`, `projectStore.getFolio`, `/api/folios`.

> **Folio vs. entry.** The UI says "entry" ("+ ADD ENTRY", "12 ENTRIES", `EntryContent`,
> [ADR-0011](docs/adr/0011-unify-entry-cards-and-ranking.md)); code and API say "folio". Both are
> current. Treat "entry" as the reader-facing word for a folio and keep it out of type, function,
> and endpoint names.

Never call a folio a document, page, article, note, or record. **Record** is taken: it means an
entry in the in-memory index (see below), not the file.

## Project

**Project** — one folder on disk holding the whole world: a `config.json`, a `schema.json`, and
one subfolder of `.md` files per type. The server is pointed at exactly one project via
`--project`. The files are the source of truth; there is no database.

**Sample project** — `fall-of-troy/`, the worked example shipped in the repo. Tests may read it
only to assert that real files parse; see the synthetic-schema rule in [Testing](docs/testing.md).

## Schema vocabulary

**Type** — a kind of folio, declared as a key in `schema.json` (`Character`, `Location`). Nothing
about any type is hardcoded; the UI is built from the schema at runtime.

**Folder** — the directory a type's files live in, declared by that type's `folder`. One folder
belongs to exactly one type, and wiki-links address the folder, never the type key. That
bijection is relied on throughout and is the subject of [ADR-0019](docs/adr/0019-schema-index.md).

**Section** — a named block within a type, rendered from a `## Heading`. A section is one of
three **kinds**: *prose* (free text), *links* (a section-level list of wiki-links), or *fields*
(a map of named values). The kind is resolved from the section's schema definition by
`classifySection`, which is the only place that reads the raw `type`/`fields` properties; every
consumer switches on the `kind` it returns. See
[ADR-0021](docs/adr/0021-section-kind-union.md).

**Role** — an optional layout hint on a section, either `meta` or `prose`. The read view builds
its two-column top block from whichever sections carry them. A role is a layout instruction, not
a section kind.

**Field** — a single named value inside a fields-section, with one of eight **field types**
(`text`, `text-list`, `select`, `multiselect`, `date`, `textarea`, `wikilink`, `wikilink-list`).
A field is **empty** — omitted from both the file and the read view — per `isFieldValueEmpty`,
the one predicate the serializer and the read view share.

**Option** — an allowed value for a `select`/`multiselect` field. An option marked `inactive`
still parses but is not offered for new input.

## Identity

**Name** — a folio's filename stem, underscored and URL-safe (`Mycenaean_Invasion_of_Kea`). This
is the folio's stable ID and what wiki-links point at.

**Title** — the display name, taken from the file's `# H1`. Free-form; may contain characters a
filename cannot. The title is the source of truth for display, and the name is derived from it —
so changing a title renames the file and rewrites every link to it.

**Alias** — an alternative name, from Obsidian's native `aliases` frontmatter. Aliases are
searchable and can be used as wiki-link display text.

**Folio number** — the sequential ID assigned to each folio at index time and shown as a Roman
numeral in the UI. Assigned alphabetically at boot, preserved across a rename, and never written
to disk.

## Links

**Wiki-link** — an `[[Folder/Name]]` or `[[Folder/Name|Alias]]` reference. First-class, and the
only non-standard Markdown the app is allowed to write.

**Backlink** — the inverse: the folios that link *to* a given folio. Computed from the index, not
stored.

**Unresolved link** (client) / **broken link** (server) — a wiki-link whose target folio does not
exist. Never an error; both read and save tolerate it and surface it for the user to fix.

## Index and state

**Folio index** — the in-memory list the server builds by scanning the project at boot. Holds one
**index record** per folio: identity, tags, aliases, a snippet, warnings, and outgoing links —
enough for the sidebar and index views without re-reading any file. Rebuilt by `POST /api/reload`;
the app does not watch the filesystem.

**Snippet** — the ≤120-character excerpt of a folio's prose section, cached in its index record
for search and list views.

**Sync** — the user-facing name for a reload: rebuild the index from disk and invalidate the
client's caches. The header button says Sync; the endpoint says reload.

## Reading and writing

**Warning vs. error** — the severity split that runs through the whole system: reading is
lenient and produces **warnings** (schema drift already on disk is tolerated and shown), writing
is strict and produces **errors** (a save that violates the schema is rejected). One rule engine,
`validateAgainstSchema`, defines both; its **validation mode** (`read` or `write`) selects the
severity. Deliberate; see
[ADR-0009](docs/adr/0009-consolidate-folio-validation-rules.md) and the rule table in
[Data Model](docs/data-model.md#validation).

**Stale save** — a save rejected because the file's `mtime` moved since the client loaded it,
meaning something edited it outside the app. Returns `409`.

**Link rewrite** — the project-wide pass that follows a rename, updating every `[[Folder/Old]]`
reference. Planned and verified across all affected files before the first write, so a conflict
aborts the whole save rather than tearing it; see
[ADR-0010](docs/adr/0010-multi-file-write-safety.md).

## Surfaces

**Landing** — the project home at `/`. **Grand Index** — the searchable index of every folio, at
`/archive`. **Category index** — the same for one type, at `/folio/:folder`. **Read mode** and
**edit mode** — the two folio views, separate routes rather than one route with a toggle.

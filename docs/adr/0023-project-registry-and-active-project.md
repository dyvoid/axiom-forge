# 23. Project Registry and One Active Project

**Date:** 2026-11-11
**Status:** Accepted

## Context

[ADR-0002](0002-multi-project-management.md) decided that the app should handle more than one
project and listed the surfaces: a switcher, a config editor, removal. It left open how the server
holds several projects, saying only that the single `--project` flag would "likely" go.

Three things had to be settled before any of that could be built.

**Where the list of projects lives.** A project is a folder, and nothing in it may say where other
projects are: the folder is meant to be portable, synced and opened in Obsidian.

**What the API addresses.** Every endpoint is unscoped (`/api/folios/:folder/:name`) and is a
public contract that may not be renamed without instruction. Serving several projects at once
would mean a project id in every path.

**What happens to a window when the project changes under it.** With unscoped endpoints, a
browser tab showing project A keeps working after a second tab opens project B, except that it
now reads and writes B.

[ADR-0013](0013-project-scaffolding.md) was to lead on the entry surface. It is still a skeleton,
and the user asked for multi-project to be built now, so the parts of that surface this feature
cannot work without are decided here and recorded in ADR-0013 as settled. Its real subject, how a
schema gets designed, is untouched.

## Decision

### A registry file outside every project

The server keeps the list in one JSON file, `projects.json`, in `~/.axiom-forge/` (or the folder
named by `AXIOM_FORGE_HOME`). It holds folder paths and which project was open last: nothing a
project's own files could not rebuild. A project's id is a hash of its canonical path, so adding
the same folder twice is one project.

`ProjectRegistry` (`packages/server/src/projectRegistry.ts`) owns the file and the list.

### One active project, and the endpoints stay where they are

Exactly one project is *active*: a loaded `ProjectStore`. The existing endpoints serve it,
unchanged. New endpoints under `/api/projects` list, add, open, edit and remove projects.

Serving every project at once was rejected. It would rename the whole public API, keep an index in
memory per project, and buy concurrent access to several worlds from one browser: a need a
solo-user tool has not shown.

Opening a project loads it completely before it replaces the current one, the same rule
`reload` follows. A project that will not load leaves the previous one serving.

### `--project` opens rather than restricts

The flag still works. It now means "open this folder, adding it to the list if it is new". With no
flag the server reopens the last project. On a first run, before any list exists, it adds and
opens the bundled sample. A project that fails to load at startup no longer stops the server: it
starts with nothing open and the client shows the list.

### A window names its project on every request

The client sends `X-Axiom-Project` with each request. If it is not the active project the server
answers `409 project-changed`, so a stale window cannot read from or write into the wrong
project. A request without the header is allowed, because an `<img>` cannot send one.

A stale window does not follow the switch on its own. It keeps what it has on screen, an unsaved
draft included, and asks whether to reopen its project or move to the other one.

### The entry surface

- **No project open.** The project gate redirects to `/projects`, the list. There is no separate
  empty-state screen.
- **Choosing a folder.** A text field taking a full path. A browser page cannot open a native
  folder dialog that yields a path. [ADR-0005](0005-desktop-packaging-distribution.md)'s Electron
  picker can fill the same field later.
- **Starting a project.** Adding a folder that holds neither `config.json` nor `schema.json`
  offers to start one there: a `config.json` with the given name, and a fixed one-type starter
  schema. Templates and schema editing remain ADR-0013's.

### Removal

Removing takes a project off the list and nothing else; it is the default and needs one
confirmation. Deleting the folder is a second, separate choice. The server refuses it unless the
folder still holds both project files, the request repeats the project's name, and the folder is
not a drive root, the home folder, or an ancestor of the server's own working directory.

## Consequences

- The server now writes outside the project folder and outside the repository, to the user's home
  directory. Deleting `~/.axiom-forge/` forgets the list and loses no project data.
- Two windows cannot show two projects at once. The second switch is detected and the first window
  asks what to do; it does not lose work, but it cannot continue until one project is chosen.
- Client query keys carry no project id. Switching clears the whole cache instead.
- The starter schema is deliberately generic. A new project is usable at once, but shaping its
  schema still means editing JSON by hand, which is the gap ADR-0013 exists to close.
- [ADR-0020](0020-folio-index-module.md) is unaffected: `ProjectStore` gained two small methods
  (`refreshConfig`, `idle`) and its `load`/`reload` surface is as it was.
- `localOnly` (the Host and Origin check) matters more than before: an endpoint now accepts an
  arbitrary folder path, and another can delete a folder.

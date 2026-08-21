# Design review fixes

Session prompt (abridged): "can you use /impeccable to see how we can make the design better?"
— followed by "Look at docs/screenshots to evaluate the actual visuals" and "yes, make a branch
and start your work. One Commit each."

An impeccable-skill design review (file scan + source reading + the three tracked screenshots)
produced a findings list. Four mechanical fixes were approved, one commit each:

1. `EntryContent.module.css` `.rowTitle` used `font-weight: 700` in Cormorant Garamond, but
   `index.html` only loads 400/500/600 — browsers synthesized a faux bold. Use the loaded 600.
2. `index.html` loaded three weights of Cinzel, which no source file references. Remove.
3. Grand Index letter groups flowed row-major via flex-wrap (A, D across the top row); an
   alphabetical index is scanned down a column. Switch to CSS multi-column for column-major flow.
4. MetaSection's field grid reserved 170px for labels inside a 280px column, leaving ~94px for
   values, so long values wrapped in a cramped slot. Narrow the label column.

During work it was found that the right-aligned, ragged-left meta values visible in
`docs/screenshots/folio.jpg` do not exist in current code (no `text-align: right` anywhere in
MetaSection history) — fix 4 targets the current cramped-wrap reality instead.

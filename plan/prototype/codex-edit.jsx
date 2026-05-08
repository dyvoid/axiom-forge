// codex-edit.jsx — Edit-mode document view for Codex direction.
// Schema-driven: every field type from the brief gets an appropriate control,
// styled to read like marginalia rather than a form.
// Exposes window.CodexEdit. Reuses .codex CSS from codex.jsx.

const { useState: useStateE, useRef: useRefE, useEffect: useEffectE } = React;

// ----- Search options for the wiki-link picker -----
const PICKER_DOCS = {
  Characters: ['Arion','Leandros','Lyssa','Melina','Mira','Telamonas','Ylverian','Aiakos','Briseis','Eurynome'],
  Species:    ['Human','Ancient Being','Daimon','Sea-Born','Shade'],
  Locations:  ['Kea','Crete','Knossos','Mycenae','Thera','The Unbound Realm','Phaistos','Pylos'],
  Events:     ['Mycenaean Invasion of Kea','Defense of the Minoan City','Divine Fusion','Fall of Crete','Eruption of Thera'],
  Factions:   ['Minoans','Mycenaeans','The Choir','House of Lyssa','Thalassocrats'],
  Lore:       ['Cosmic Fusion','The Choir','Bronze Age Calendar','Linear A'],
  Timeline:   ['Bronze Age Arc','Cosmic Arc','Cretan War'],
};

// =====================================================================
// Atoms
// =====================================================================

const cxFieldStyle = {
  fontFamily: 'var(--body)',
  fontSize: 15,
  color: 'var(--ink)',
  background: 'rgba(255, 250, 235, 0.55)',
  border: '1px solid var(--rule)',
  padding: '7px 10px',
  outline: 'none',
  width: '100%',
  borderRadius: 0,
  transition: 'border-color 120ms, background 120ms',
};

function CxText({ value, onChange, placeholder, multiline }) {
  const [focused, setFocused] = useStateE(false);
  const Cmp = multiline ? 'textarea' : 'input';
  return (
    <Cmp
      type={multiline ? undefined : 'text'}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...cxFieldStyle,
        ...(multiline ? { minHeight: 120, resize: 'vertical', lineHeight: 1.7, fontSize: 16 } : {}),
        borderColor: focused ? 'var(--oxblood)' : 'var(--rule)',
        background: focused ? 'rgba(255,250,235,0.9)' : 'rgba(255,250,235,0.5)',
      }}
    />
  );
}

function CxSelect({ value, options, onChange }) {
  const [open, setOpen] = useStateE(false);
  const ref = useRefE(null);
  useEffectE(() => {
    function out(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...cxFieldStyle,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: open ? 'rgba(255,250,235,0.9)' : 'rgba(255,250,235,0.55)',
          borderColor: open ? 'var(--oxblood)' : 'var(--rule)',
        }}
      >
        <span>{value || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--paper)',
          border: '1px solid var(--ink-3)',
          boxShadow: '0 8px 28px rgba(40,30,20,0.18)',
          zIndex: 10,
          maxHeight: 240, overflowY: 'auto',
        }}>
          {options.map(o => (
            <div
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer',
                fontFamily: 'var(--body)', fontSize: 14,
                color: 'var(--ink)',
                background: value === o ? 'rgba(138, 53, 34, 0.08)' : 'transparent',
                borderBottom: '1px solid rgba(205, 185, 142, 0.4)',
              }}
              onMouseEnter={e => { if (value !== o) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { if (value !== o) e.currentTarget.style.background = 'transparent'; }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tag-style inputs (text-list / multiselect / wiki-link list)
function CxTagList({ items, onRemove, renderTag, addAffordance }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px 8px',
      alignItems: 'center',
      padding: '6px 8px',
      border: '1px solid var(--rule)',
      background: 'rgba(255,250,235,0.4)',
      minHeight: 38,
    }}>
      {items.map((it, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--body)', fontSize: 14,
          color: 'var(--ink)',
          background: 'rgba(154, 122, 44, 0.12)',
          border: '1px solid rgba(154, 122, 44, 0.4)',
          padding: '3px 4px 3px 8px',
        }}>
          {renderTag ? renderTag(it) : it}
          <button onClick={() => onRemove(i)} style={{
            background: 'transparent', border: 0,
            color: 'var(--ink-3)', cursor: 'pointer',
            fontSize: 13, lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </span>
      ))}
      {addAffordance}
    </div>
  );
}

function CxFreeTagInput({ items, onChange }) {
  const [draft, setDraft] = useStateE('');
  return (
    <CxTagList
      items={items}
      onRemove={i => onChange(items.filter((_, x) => x !== i))}
      addAffordance={
        <input
          value={draft}
          placeholder={items.length === 0 ? 'add value, press ↵' : 'add…'}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && items.length) {
              onChange(items.slice(0, -1));
            }
          }}
          style={{
            border: 0, background: 'transparent', outline: 'none',
            fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink)',
            padding: '4px 0', minWidth: 100, flex: 1,
            fontStyle: 'italic',
          }}
        />
      }
    />
  );
}

function CxMultiSelect({ items, options, onChange }) {
  const [open, setOpen] = useStateE(false);
  const ref = useRefE(null);
  useEffectE(() => {
    function out(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);
  const remaining = options.filter(o => !items.includes(o));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <CxTagList
        items={items}
        onRemove={i => onChange(items.filter((_, x) => x !== i))}
        addAffordance={
          <button onClick={() => setOpen(o => !o)} style={{
            background: 'transparent', border: '1px dashed var(--ink-3)',
            color: 'var(--ink-3)', cursor: 'pointer',
            fontFamily: 'var(--body)', fontSize: 13, fontStyle: 'italic',
            padding: '3px 10px',
          }}>+ add</button>
        }
      />
      {open && remaining.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--paper)',
          border: '1px solid var(--ink-3)',
          boxShadow: '0 8px 28px rgba(40,30,20,0.18)',
          zIndex: 10, maxHeight: 240, overflowY: 'auto',
        }}>
          {remaining.map(o => (
            <div key={o} onClick={() => { onChange([...items, o]); setOpen(false); }}
                 style={{ padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--body)', fontSize: 14 }}
                 onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Wikilink picker — items are { link: "Folder/Name", status?, label? }
function CxWikilinkPicker({ items, onChange, target = 'Characters', single = false }) {
  const [open, setOpen] = useStateE(false);
  const [query, setQuery] = useStateE('');
  const ref = useRefE(null);
  useEffectE(() => {
    function out(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);
  const targetType = window.AxiomFolderToType[target];
  const glyph = window.AxiomTypes[targetType]?.glyph || '◆';
  const all = (PICKER_DOCS[target] || []);
  const taken = new Set(items.map(it => it.link));
  const matches = all
    .filter(n => !taken.has(`${target}/${n}`))
    .filter(n => n.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function add(name) {
    const next = [...items, { link: `${target}/${name}` }];
    onChange(single ? next.slice(-1) : next);
    setQuery('');
    if (single) setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <CxTagList
        items={items}
        onRemove={i => onChange(items.filter((_, x) => x !== i))}
        renderTag={it => {
          const parsed = window.AxiomParseLink(it.link);
          const g = window.AxiomTypes[parsed.type]?.glyph || '◆';
          return (
            <>
              <span style={{ color: 'var(--gold)', fontSize: 12 }}>{g}</span>
              <span style={{
                color: it.status === 'deceased' ? 'var(--ink-3)' : 'var(--oxblood)',
                fontStyle: it.status === 'deceased' ? 'italic' : 'normal',
              }}>{parsed.label}</span>
            </>
          );
        }}
        addAffordance={
          (single && items.length >= 1) ? null : (
            <button onClick={() => setOpen(true)} style={{
              background: 'transparent', border: '1px dashed var(--ink-3)',
              color: 'var(--ink-3)', cursor: 'pointer',
              fontFamily: 'var(--body)', fontSize: 13, fontStyle: 'italic',
              padding: '3px 10px',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'var(--gold)', fontStyle: 'normal' }}>{glyph}</span>
              + link {target.toLowerCase().slice(0, -1)}
            </button>
          )
        }
      />
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 320,
          background: 'var(--paper)',
          border: '1px solid var(--ink-3)',
          boxShadow: '0 12px 36px rgba(40,30,20,0.22)',
          zIndex: 10,
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--rule)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${target}…`}
              style={{
                width: '100%', border: 0, outline: 'none', background: 'transparent',
                fontFamily: 'var(--body)', fontSize: 14, padding: '4px 6px',
                color: 'var(--ink)',
              }}
            />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {matches.length === 0 ? (
              <div style={{ padding: 14, color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>
                No matches. Press <kbd style={{ fontFamily: 'var(--body)' }}>↵</kbd> to create new.
              </div>
            ) : matches.map(m => (
              <div key={m} onClick={() => add(m)} style={{
                padding: '8px 12px', cursor: 'pointer',
                fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: 'var(--gold)', fontSize: 12 }}>{glyph}</span>
                {m}
              </div>
            ))}
          </div>
          <div style={{
            padding: '6px 12px', borderTop: '1px solid var(--rule)',
            color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--body)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Linking from <em>{target}</em></span>
            <span>↑↓ navigate · ↵ pick</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Field row matching the read mode layout, but with a control on the right.
function FieldRow({ label, hint, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '170px 1fr',
      gap: 16, alignItems: 'flex-start',
      padding: '8px 0',
      borderBottom: '1px dotted rgba(108, 94, 70, 0.35)',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--body)', fontSize: 11,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--ink-3)', fontWeight: 500, paddingTop: 9,
        }}>{label}</div>
        {hint && (
          <div style={{
            fontSize: 10, color: 'var(--ink-3)',
            fontStyle: 'italic', marginTop: 2,
          }}>{hint}</div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionHeader({ children, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: 14,
    }}>
      <div className="smallcap">{children}</div>
      {action}
    </div>
  );
}

// =====================================================================
// EDIT VIEW
// =====================================================================
function CodexEdit() {
  const T = window.AxiomThalirin;

  const [title, setTitle] = useStateE(T.name);
  const [status, setStatus] = useStateE(T.status);
  const [tags, setTags] = useStateE([...T.tags]);

  // Basic info — keep schema field names as-is.
  const [sex, setSex] = useStateE('Male');
  const [dob, setDob] = useStateE('1502 BCE');
  const [dod, setDod] = useStateE('1449 BCE');
  const [age, setAge] = useStateE('53');
  const [otherNames, setOtherNames] = useStateE([]);
  const [titles, setTitles] = useStateE(['Defender of the City']);
  const [species, setSpecies] = useStateE([{ link: 'Species/Human' }]);
  const [origin, setOrigin] = useStateE([{ link: 'Locations/Kea' }]);
  const [residence, setResidence] = useStateE([{ link: 'Locations/Crete' }]);
  const [death, setDeath] = useStateE([{ link: 'Locations/Crete' }]);

  // Relationships
  const [parents, setParents] = useStateE([
    { link: 'Characters/Lyssa', status: 'deceased' },
    { link: 'Characters/Telamonas', status: 'deceased' },
  ]);
  const [siblings, setSiblings] = useStateE([{ link: 'Characters/Mira' }]);
  const [extFamily, setExtFamily] = useStateE([{ link: 'Characters/Leandros' }, { link: 'Characters/Arion' }]);
  const [allies, setAllies] = useStateE([{ link: 'Characters/Melina' }]);
  const [complicated, setComplicated] = useStateE([{ link: 'Characters/Ylverian' }]);

  // Long-form prose
  const [history, setHistory] = useStateE(T.history);
  const [personality, setPersonality] = useStateE(T.personality);
  const [notes, setNotes] = useStateE(T.notes);

  // Connected
  const [events, setEvents] = useStateE(T.events.map(e => ({ link: e.link })));
  const [factions, setFactions] = useStateE(T.factions.map(e => ({ link: e.link })));

  const [dirty, setDirty] = useStateE(true);
  const wrapSet = setter => v => { setter(v); setDirty(true); };

  return (
    <>
      <div className="codex">
        <div className="paper-grain" />

        {/* App header */}
        <div style={{
          height: 48, padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 24,
          borderBottom: '1px solid var(--rule)',
          background: 'var(--paper-2)',
        }}>
          <div className="smallcap">Axiom · Forge</div>
          <div style={{ width: 1, height: 18, background: 'var(--rule)' }} />
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 18, color: 'var(--ink)',
          }}>Burden of the Guardian</div>
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid var(--rule)', padding: '6px 12px',
            width: 280, color: 'var(--ink-3)', fontSize: 13,
          }}>
            <span>⌕</span>
            <span style={{ fontStyle: 'italic' }}>Search the archive…</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>/</span>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '240px 1fr',
          height: 'calc(100% - 48px)',
        }}>
          {/* Sidebar (mirrors read mode) */}
          <aside style={{
            borderRight: '1px solid var(--rule)',
            padding: '24px 20px', overflowY: 'auto',
            background: 'var(--paper-2)',
          }}>
            <div className="smallcap" style={{ marginBottom: 12 }}>Index</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {window.AxiomSidebarTypes.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                  fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.3,
                  color: t.key === 'Character' ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: t.key === 'Character' ? 500 : 400,
                  borderBottom: t.key === 'Character' ? '1px solid var(--ink)' : 'none',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{
                      color: 'var(--gold)', fontSize: 13,
                      width: 18, display: 'inline-flex',
                      justifyContent: 'center', alignItems: 'center',
                      marginRight: 6, lineHeight: 1,
                    }}>
                      {window.AxiomTypes[t.key].glyph}
                    </span>
                    {t.name}
                  </span>
                  <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{t.count}</span>
                </div>
              ))}
            </div>
            <hr className="rule" style={{ margin: '20px 0' }} />
            <div className="smallcap" style={{ marginBottom: 8 }}>Characters</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {window.AxiomSidebarDocs.map(d => (
                <div key={d.name} style={{
                  padding: '5px 0', fontFamily: 'var(--serif)', fontSize: 16,
                  color: d.current ? 'var(--oxblood)' : (d.status === 'deceased' ? 'var(--ink-3)' : 'var(--ink-2)'),
                  fontStyle: d.status === 'deceased' ? 'italic' : 'normal',
                  borderLeft: d.current ? '2px solid var(--oxblood)' : '2px solid transparent',
                  paddingLeft: 10, marginLeft: -10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{d.name}</span>
                  {d.current && (
                    <span style={{
                      fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                      fontFamily: 'var(--body)', color: 'var(--oxblood)',
                      fontStyle: 'normal', fontWeight: 500,
                    }}>edit</span>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Edit column */}
          <main style={{ overflowY: 'auto', padding: '36px 72px 60px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>

              {/* Edit toolbar — sticky */}
              <div style={{
                position: 'sticky', top: -36, zIndex: 5,
                margin: '-36px -72px 28px',
                padding: '14px 72px',
                background: 'rgba(243, 234, 216, 0.94)',
                backdropFilter: 'blur(6px)',
                borderBottom: '1px solid var(--rule)',
                display: 'flex', alignItems: 'center', gap: 18,
              }}>
                <div className="smallcap" style={{ color: 'var(--oxblood)' }}>
                  ✎ &nbsp; Editing folio xvii
                </div>
                <div style={{
                  fontFamily: 'var(--body)', fontSize: 12,
                  fontStyle: 'italic', color: dirty ? 'var(--oxblood)' : 'var(--ink-3)',
                }}>
                  {dirty ? '· unsaved changes' : '· all saved'}
                </div>
                <div style={{ flex: 1 }} />
                <button style={{
                  background: 'transparent', border: '1px solid var(--rule)',
                  fontFamily: 'var(--body)', fontSize: 12,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'var(--ink-3)', padding: '8px 18px', cursor: 'pointer',
                }}>Discard</button>
                <button style={{
                  background: 'var(--ink)', color: 'var(--paper)',
                  border: '1px solid var(--ink)',
                  fontFamily: 'var(--body)', fontSize: 12,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  padding: '8px 24px', cursor: 'pointer',
                }} onClick={() => setDirty(false)}>Save folio</button>
              </div>

              {/* Folio header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 14,
              }}>
                <div className="smallcap">
                  <span style={{ color: 'var(--gold)', marginRight: 8 }}>◐</span>
                  Character · Folio xvii
                </div>
                <div className="smallcap">↩ Back to read mode</div>
              </div>

              {/* Editable title */}
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); setDirty(true); }}
                style={{
                  fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 88,
                  lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em',
                  background: 'transparent', border: 0, outline: 'none',
                  borderBottom: '1px dashed var(--rule)', padding: '0 0 4px',
                  width: '100%', display: 'block', margin: '0 0 6px',
                }}
                onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--oxblood)'}
                onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--rule)'}
              />

              {/* Status / dates / tags row */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
                marginTop: 14, marginBottom: 28,
              }}>
                <div style={{ width: 160 }}>
                  <CxSelect value={status} options={['Living','Deceased','Missing','Unknown']} onChange={wrapSet(setStatus)} />
                </div>
                <span style={{
                  fontFamily: 'var(--body)', fontSize: 12, color: 'var(--ink-3)',
                  fontStyle: 'italic',
                }}>tags ·</span>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <CxFreeTagInput items={tags} onChange={wrapSet(setTags)} />
                </div>
              </div>

              <hr className="rule-2" style={{ margin: '0 0 28px' }} />

              {/* BASIC INFORMATION */}
              <SectionHeader>I. Basic Information</SectionHeader>
              <div style={{ marginBottom: 36 }}>
                <FieldRow label="Other Names" hint="text-list">
                  <CxFreeTagInput items={otherNames} onChange={wrapSet(setOtherNames)} />
                </FieldRow>
                <FieldRow label="Titles" hint="text-list">
                  <CxFreeTagInput items={titles} onChange={wrapSet(setTitles)} />
                </FieldRow>
                <FieldRow label="Sex" hint="select">
                  <CxSelect value={sex} options={['Male','Female','Other','None']} onChange={wrapSet(setSex)} />
                </FieldRow>
                <FieldRow label="Age" hint="text">
                  <CxText value={age} onChange={wrapSet(setAge)} placeholder="freeform" />
                </FieldRow>
                <FieldRow label="Date of Birth" hint="date · freeform">
                  <CxText value={dob} onChange={wrapSet(setDob)} placeholder="e.g. 1502 BCE" />
                </FieldRow>
                <FieldRow label="Date of Death" hint="date · freeform">
                  <CxText value={dod} onChange={wrapSet(setDod)} placeholder="e.g. circa 1500 BCE" />
                </FieldRow>
                <FieldRow label="Species" hint="wikilink-list → Species">
                  <CxWikilinkPicker items={species} onChange={wrapSet(setSpecies)} target="Species" />
                </FieldRow>
                <FieldRow label="Place of Origin" hint="wikilink → Locations">
                  <CxWikilinkPicker items={origin} onChange={wrapSet(setOrigin)} target="Locations" single />
                </FieldRow>
                <FieldRow label="Place of Residence" hint="wikilink → Locations">
                  <CxWikilinkPicker items={residence} onChange={wrapSet(setResidence)} target="Locations" single />
                </FieldRow>
                <FieldRow label="Place of Death" hint="wikilink → Locations">
                  <CxWikilinkPicker items={death} onChange={wrapSet(setDeath)} target="Locations" single />
                </FieldRow>
              </div>

              {/* DESCRIPTION & HISTORY (textarea) */}
              <SectionHeader>II. Description &amp; History</SectionHeader>
              <div style={{ marginBottom: 32 }}>
                <CxText multiline value={history} onChange={wrapSet(setHistory)} />
                <div style={{
                  fontFamily: 'var(--body)', fontSize: 11, color: 'var(--ink-3)',
                  fontStyle: 'italic', marginTop: 4, textAlign: 'right',
                }}>
                  {history.split(/\s+/).filter(Boolean).length} words · markdown · prose
                </div>
              </div>

              {/* PERSONALITY (textarea) */}
              <SectionHeader>III. Personality</SectionHeader>
              <div style={{ marginBottom: 32 }}>
                <CxText multiline value={personality} onChange={wrapSet(setPersonality)} />
              </div>

              <hr className="rule" style={{ margin: '0 0 24px' }} />

              {/* RELATIONSHIPS */}
              <SectionHeader>IV. Relationships</SectionHeader>
              <div style={{ marginBottom: 36 }}>
                <FieldRow label="Parents" hint="wikilink-list → Characters">
                  <CxWikilinkPicker items={parents} onChange={wrapSet(setParents)} />
                </FieldRow>
                <FieldRow label="Siblings" hint="wikilink-list → Characters">
                  <CxWikilinkPicker items={siblings} onChange={wrapSet(setSiblings)} />
                </FieldRow>
                <FieldRow label="Extended Family" hint="wikilink-list → Characters">
                  <CxWikilinkPicker items={extFamily} onChange={wrapSet(setExtFamily)} />
                </FieldRow>
                <FieldRow label="Friends/Allies" hint="wikilink-list → Characters">
                  <CxWikilinkPicker items={allies} onChange={wrapSet(setAllies)} />
                </FieldRow>
                <FieldRow label="Complicated" hint="wikilink-list → Characters">
                  <CxWikilinkPicker items={complicated} onChange={wrapSet(setComplicated)} />
                </FieldRow>
              </div>

              {/* CONNECTED — events + factions */}
              <hr className="rule" style={{ margin: '0 0 24px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 36 }}>
                <div>
                  <SectionHeader>V. Connected Events</SectionHeader>
                  <CxWikilinkPicker items={events} onChange={wrapSet(setEvents)} target="Events" />
                </div>
                <div>
                  <SectionHeader>VI. Connected Factions</SectionHeader>
                  <CxWikilinkPicker items={factions} onChange={wrapSet(setFactions)} target="Factions" />
                </div>
              </div>

              {/* NOTES (textarea) */}
              <hr className="rule" style={{ margin: '0 0 24px' }} />
              <SectionHeader
                action={
                  <span style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic',
                    fontSize: 12, color: 'var(--ink-3)',
                  }}>
                    rendered as marginalia
                  </span>
                }
              >VII. Notes</SectionHeader>
              <div style={{
                position: 'relative',
                paddingLeft: 18, borderLeft: '2px solid var(--oxblood)',
                marginBottom: 40,
              }}>
                <CxText multiline value={notes} onChange={wrapSet(setNotes)} />
              </div>

              {/* Footer / save row repeat */}
              <hr className="rule-2" style={{ margin: '0 0 18px' }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 18,
                justifyContent: 'flex-end',
              }}>
                <span style={{
                  fontFamily: 'var(--body)', fontSize: 12,
                  fontStyle: 'italic', color: dirty ? 'var(--oxblood)' : 'var(--ink-3)',
                  marginRight: 'auto',
                }}>
                  {dirty
                    ? '· unsaved changes will write to Characters/Thalirin.md'
                    : '· file in sync with disk'}
                </span>
                <button style={{
                  background: 'transparent', border: '1px solid var(--rule)',
                  fontFamily: 'var(--body)', fontSize: 12,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'var(--ink-3)', padding: '10px 22px', cursor: 'pointer',
                }}>Discard</button>
                <button style={{
                  background: 'var(--ink)', color: 'var(--paper)',
                  border: '1px solid var(--ink)',
                  fontFamily: 'var(--body)', fontSize: 12,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  padding: '10px 32px', cursor: 'pointer',
                }} onClick={() => setDirty(false)}>Save folio</button>
              </div>

              <div style={{
                textAlign: 'center', marginTop: 40,
                fontFamily: 'var(--serif)', fontStyle: 'italic',
                fontSize: 14, color: 'var(--ink-3)',
              }}>· xvii ·</div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

window.CodexEdit = CodexEdit;

// codex.jsx — Direction A: Codex Editorial
// Parchment, oxblood, Cormorant + Spectral. Quiet museum-catalog feel.
// Exposes window.CodexLanding and window.CodexDoc.

const { useEffect, useRef, useState } = React;

// ----- Shared CSS for both Codex artboards -----
const codexCSS = `
.codex {
  --paper: #f3ead8;
  --paper-2: #ebe0c8;
  --paper-edge: #d9c8a4;
  --ink: #221b13;
  --ink-2: #4a3f2e;
  --ink-3: #6c5e46;
  --rule: #cdb98e;
  --oxblood: #8a3522;
  --gold: #9a7a2c;
  --serif: "Cormorant Garamond", "EB Garamond", Georgia, serif;
  --body: "Spectral", "EB Garamond", Georgia, serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
.codex *, .codex *::before, .codex *::after { box-sizing: border-box; }

.codex .smallcap {
  font-family: var(--body);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ink-3);
}
.codex .rule {
  border: 0;
  height: 1px;
  background: var(--rule);
  margin: 0;
}
.codex .rule-2 {
  border: 0;
  height: 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  padding-top: 2px;
}

/* Wiki-link chip — bracketed inline with small type icon. */
.codex .wlink {
  display: inline-flex;
  align-items: baseline;
  gap: 0.28em;
  font-family: var(--body);
  color: var(--oxblood);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 1px solid transparent;
  transition: color 120ms, border-color 120ms;
}
.codex .wlink:hover { color: var(--ink); border-color: var(--oxblood); }
.codex .wlink .br { color: var(--ink-3); font-weight: 400; opacity: 0.75; }
.codex .wlink .glyph {
  font-size: 0.85em;
  color: var(--gold);
  margin-right: 0.05em;
  transform: translateY(-0.05em);
  display: inline-block;
}
.codex .wlink.deceased { color: var(--ink-3); font-style: italic; }
.codex .wlink.deceased .glyph { color: var(--ink-3); opacity: 0.5; }

.codex .field-row {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 16px;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px dotted rgba(108, 94, 70, 0.35);
}
.codex .field-row:last-child { border-bottom: 0; }
.codex .field-label {
  font-family: var(--body);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-weight: 500;
}
.codex .field-value {
  font-family: var(--body);
  font-size: 15px;
  color: var(--ink);
}

/* Subtle paper texture — repeating noise over the parchment. */
.codex .paper-grain {
  position: absolute; inset: 0; pointer-events: none;
  opacity: 0.5; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.13  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
`;

// Wiki-link chip — bracketed with type icon.
function CodexWLink({ link, label, status }) {
  const parsed = window.AxiomParseLink(link);
  const text = label || parsed.label;
  const glyph = window.AxiomTypes[parsed.type]?.glyph || '◆';
  const cls = 'wlink' + (status === 'deceased' ? ' deceased' : '');
  return (
    <a href="#" className={cls} onClick={(e) => e.preventDefault()}>
      <span className="br">[</span>
      <span className="glyph">{glyph}</span>
      <span>{text}</span>
      <span className="br">]</span>
    </a>
  );
}

// =====================================================================
// LANDING — Codex
// =====================================================================
function CodexLanding() {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const teardown = window.initHero(canvasRef.current, 'codex');
    return teardown;
  }, []);

  return (
    <>
      <style>{codexCSS}</style>
      <div className="codex" style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            display: 'block',
          }}
        />
        <div className="paper-grain" />

        {/* Top header row — folio-style */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '28px 56px',
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          zIndex: 2,
        }}>
          <div className="smallcap" style={{ fontSize: 11 }}>
            Axiom&nbsp;·&nbsp;Forge
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            <span className="smallcap">vol. ɪ</span>
            <span className="smallcap">mmxxvi</span>
            <span className="smallcap">private archive</span>
          </div>
        </div>

        {/* Center plate — minimal: project title + enter */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 56px', zIndex: 2,
        }}>
          <h1 style={{
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 116,
            lineHeight: 1.0,
            letterSpacing: '-0.015em',
            color: 'var(--ink)',
            margin: 0,
            textAlign: 'center',
            maxWidth: 1000,
          }}>
            Burden of the Guardian
          </h1>

          {/* Hairline + small project meta */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 22,
            marginTop: 36,
          }}>
            <span style={{ width: 56, height: 1, background: 'var(--rule)' }} />
            <span className="smallcap" style={{ color: 'var(--ink-3)' }}>
              Bronze Age · Minoan / Mycenaean · 134 entries
            </span>
            <span style={{ width: 56, height: 1, background: 'var(--rule)' }} />
          </div>

          {/* Enter button */}
          <button style={{
            marginTop: 44,
            background: 'transparent',
            border: '1px solid var(--ink)',
            padding: '14px 40px',
            fontFamily: 'var(--body)',
            fontSize: 13,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--paper)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)'; }}
          >
            Enter the archive
            <span style={{ fontSize: 16, letterSpacing: 0 }}>→</span>
          </button>
        </div>

        {/* Bottom row — types as a quiet contents index */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '28px 56px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderTop: '1px solid var(--rule)',
          zIndex: 2,
          background: 'var(--paper)',
        }}>
          <div className="smallcap">Contents</div>
          <div style={{ display: 'flex', gap: 28, fontFamily: 'var(--body)', fontSize: 12 }}>
            {window.AxiomSidebarTypes.map(t => (
              <span key={t.name} style={{ color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--gold)', marginRight: 6 }}>
                  {window.AxiomTypes[t.key].glyph}
                </span>
                {t.name}
                <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>{t.count}</span>
              </span>
            ))}
          </div>
          <div className="smallcap">i</div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// DOC VIEW — Codex
// =====================================================================
function CodexDoc() {
  const T = window.AxiomThalirin;

  return (
    <>
      <style>{codexCSS}</style>
      <div className="codex">
        <div className="paper-grain" />

        {/* App header */}
        <div style={{
          height: 48,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 24,
          borderBottom: '1px solid var(--rule)',
          fontFamily: 'var(--body)',
          background: 'var(--paper-2)',
        }}>
          <div className="smallcap">Axiom · Forge</div>
          <div style={{ width: 1, height: 18, background: 'var(--rule)' }} />
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 18, color: 'var(--ink)',
          }}>
            Burden of the Guardian
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100% - 48px)' }}>
          {/* Sidebar */}
          <aside style={{
            borderRight: '1px solid var(--rule)',
            padding: '24px 20px',
            overflowY: 'auto',
            background: 'var(--paper-2)',
          }}>
            <div className="smallcap" style={{ marginBottom: 12 }}>Index</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {window.AxiomSidebarTypes.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                  fontFamily: 'var(--serif)',
                  fontSize: 17,
                  lineHeight: 1.3,
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
                  <span style={{
                    fontFamily: 'var(--body)', fontSize: 11,
                    color: 'var(--ink-3)', letterSpacing: '0.04em',
                  }}>{t.count}</span>
                </div>
              ))}
            </div>

            <hr className="rule" style={{ margin: '20px 0' }} />

            <div className="smallcap" style={{ marginBottom: 8 }}>Characters</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {window.AxiomSidebarDocs.map(d => (
                <div key={d.name} style={{
                  padding: '5px 0',
                  fontFamily: 'var(--serif)',
                  fontSize: 16,
                  color: d.current ? 'var(--oxblood)' : (d.status === 'deceased' ? 'var(--ink-3)' : 'var(--ink-2)'),
                  fontStyle: d.status === 'deceased' ? 'italic' : 'normal',
                  borderLeft: d.current ? '2px solid var(--oxblood)' : '2px solid transparent',
                  paddingLeft: 10,
                  marginLeft: -10,
                }}>
                  {d.name}
                </div>
              ))}
            </div>

            <hr className="rule" style={{ margin: '20px 0' }} />

            <div style={{
              padding: '10px 0', display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--body)',
              fontStyle: 'italic', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 14 }}>+</span> New entry
            </div>
          </aside>

          {/* Document column */}
          <main style={{
            overflowY: 'auto',
            padding: '48px 72px',
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>

              {/* Folio header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 18,
              }}>
                <div className="smallcap">
                  <span style={{ color: 'var(--gold)', marginRight: 8 }}>◐</span>
                  Character · Folio xvii
                </div>
                <div className="smallcap">
                  Edit · Backlinks · ⋯
                </div>
              </div>

              {/* Title */}
              <h1 style={{
                fontFamily: 'var(--serif)',
                fontWeight: 400,
                fontSize: 88,
                lineHeight: 1,
                margin: '0 0 6px',
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
              }}>
                Thalirin
              </h1>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic',
                fontSize: 22, color: 'var(--ink-3)', marginBottom: 4,
              }}>
                of Kea, the mortal vessel of Ylverian
              </div>

              {/* Status + tags */}
              <div style={{
                display: 'flex', gap: 18, alignItems: 'center',
                fontFamily: 'var(--body)', fontSize: 12,
                color: 'var(--ink-3)', letterSpacing: '0.06em',
                marginTop: 14,
              }}>
                <span style={{
                  padding: '3px 10px', border: '1px solid var(--ink-3)',
                  textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 10,
                }}>{T.status}</span>
                <span>1502 — 1449 BCE</span>
                <span style={{ fontStyle: 'italic' }}>{T.tags.join(' · ')}</span>
              </div>

              <hr className="rule-2" style={{ margin: '36px 0 28px' }} />

              {/* Two-column: facts + lede prose */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 48, marginBottom: 40 }}>
                <div>
                  <div className="smallcap" style={{ marginBottom: 14 }}>Description &amp; History</div>
                  <p style={{
                    fontFamily: 'var(--body)', fontSize: 16, lineHeight: 1.7,
                    color: 'var(--ink)', margin: 0, textWrap: 'pretty',
                  }}>
                    <span style={{
                      float: 'left',
                      fontFamily: 'var(--serif)', fontStyle: 'italic',
                      fontSize: 64, lineHeight: 0.9,
                      paddingRight: 10, paddingTop: 6,
                      color: 'var(--oxblood)',
                    }}>B</span>
                    {T.history.split('\n\n')[0].slice(1)}
                  </p>
                  <p style={{
                    fontFamily: 'var(--body)', fontSize: 16, lineHeight: 1.7,
                    color: 'var(--ink)', marginTop: '1em', textWrap: 'pretty',
                  }}>
                    {T.history.split('\n\n')[1]}
                  </p>
                </div>

                <aside style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 24 }}>
                  <div className="smallcap" style={{ marginBottom: 12 }}>Basic Information</div>
                  <div style={{ fontFamily: 'var(--body)', fontSize: 13.5, lineHeight: 1.7 }}>
                    {T.basic.map(([k, v]) => (
                      <div key={k} style={{
                        display: 'flex', flexDirection: 'column',
                        marginBottom: 10,
                      }}>
                        <span style={{
                          fontSize: 10, letterSpacing: '0.18em',
                          textTransform: 'uppercase', color: 'var(--ink-3)',
                          marginBottom: 2,
                        }}>{k}</span>
                        <span style={{ color: 'var(--ink)' }}>
                          {typeof v === 'string'
                            ? v
                            : <CodexWLink link={v.link} />}
                        </span>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              {/* Personality */}
              <div className="smallcap" style={{ marginBottom: 12 }}>Personality</div>
              <p style={{
                fontFamily: 'var(--body)', fontSize: 16, lineHeight: 1.7,
                margin: '0 0 36px', color: 'var(--ink)', textWrap: 'pretty',
              }}>{T.personality}</p>

              {/* Relationships */}
              <hr className="rule" style={{ margin: '0 0 24px' }} />
              <div className="smallcap" style={{ marginBottom: 14 }}>Relationships</div>
              <div style={{ marginBottom: 36 }}>
                {T.relationships.map(([k, v]) => (
                  <div key={k} className="field-row">
                    <div className="field-label">{k}</div>
                    <div className="field-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                      {v.map((it, i) => (
                        <CodexWLink key={i} link={it.link} status={it.status} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected events + factions */}
              <hr className="rule" style={{ margin: '0 0 24px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 36 }}>
                <div>
                  <div className="smallcap" style={{ marginBottom: 12 }}>Connected Events</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {T.events.map(e => (
                      <CodexWLink key={e.link} link={e.link} label={e.label} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="smallcap" style={{ marginBottom: 12 }}>Connected Factions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {T.factions.map(e => (
                      <CodexWLink key={e.link} link={e.link} label={e.label} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <hr className="rule" style={{ margin: '0 0 24px' }} />
              <div className="smallcap" style={{ marginBottom: 12 }}>Marginalia</div>
              <p style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic',
                fontSize: 18, lineHeight: 1.6, color: 'var(--ink-2)',
                margin: '0 0 40px', textWrap: 'pretty',
                paddingLeft: 18, borderLeft: '2px solid var(--oxblood)',
              }}>{T.notes}</p>

              {/* Backlinks */}
              <hr className="rule-2" style={{ margin: '0 0 18px' }} />
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                marginBottom: 14,
              }}>
                <div className="smallcap">Backlinks · {T.backlinks.length}</div>
                <div className="smallcap" style={{ color: 'var(--ink-3)' }}>cited in</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginBottom: 24 }}>
                {T.backlinks.map(b => (
                  <CodexWLink key={b.link} link={b.link} label={b.label} />
                ))}
              </div>

              {/* Folio number */}
              <div style={{
                textAlign: 'center', marginTop: 60,
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

window.CodexLanding = CodexLanding;
window.CodexDoc = CodexDoc;

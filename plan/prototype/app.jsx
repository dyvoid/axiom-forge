// app.jsx — Codex Editorial direction (chosen by user).

const { createRoot } = ReactDOM;

function App() {
  return (
    <DesignCanvas
      title="Axiom Forge — Codex Editorial"
      subtitle="Parchment, oxblood, Cormorant + Spectral. Click an artboard's expand icon (↔) to view fullscreen."
    >
      <DCSection
        id="codex"
        title="Codex Editorial"
        subtitle="Drifting golden dust over warm parchment. Quiet museum-catalog typography."
      >
        <DCArtboard id="codex-landing" label="Landing — Burden of the Guardian" width={1280} height={800}>
          <window.CodexLanding />
        </DCArtboard>
        <DCArtboard id="codex-doc" label="Document — read mode" width={1280} height={1100}>
          <window.CodexDoc />
        </DCArtboard>
        <DCArtboard id="codex-edit" label="Document — edit mode" width={1280} height={1400}>
          <window.CodexEdit />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

createRoot(document.getElementById('root')).render(<App />);

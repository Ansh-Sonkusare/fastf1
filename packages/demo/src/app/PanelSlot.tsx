import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from "react";
import type { PanelDef } from "../panels/registry";
import { Label, retryStyle } from "../ui/primitives";
import { color, type } from "../ui/tokens";
import type { PanelProps } from "./types";

class Boundary extends Component<{ fallback: (error: Error) => ReactNode; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.warn("panel crashed", error);
  }
  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

/** One panel: lazy chunk + error boundary. RETRY re-imports the chunk and remounts the panel. */
export function PanelSlot({ def, props }: { def: PanelDef; props: PanelProps }) {
  const [attempt, setAttempt] = useState(0);
  const [Panel, setPanel] = useState<ComponentType<PanelProps>>(() => lazy(def.load));
  const retry = () => {
    setPanel(() => lazy(def.load));
    setAttempt((n) => n + 1);
  };
  return (
    <Boundary
      key={attempt}
      fallback={(error) => (
        <section
          data-panel={def.num}
          role="alert"
          style={{ background: color.panel, border: `1px solid ${color.red}`, borderRadius: 4, padding: 12, display: "flex", gap: 10, alignItems: "center", font: type.label, color: color.red }}
        >
          {def.num} {def.title.toUpperCase()} FAILED · {error.message}
          <button type="button" onClick={retry} style={retryStyle}>
            RETRY
          </button>
        </section>
      )}
    >
      <Suspense fallback={<Label tone={color.dim}>{def.num} loading…</Label>}>
        <Panel {...props} />
      </Suspense>
    </Boundary>
  );
}

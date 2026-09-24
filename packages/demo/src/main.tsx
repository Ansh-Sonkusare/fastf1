import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadInitialData, type DemoInitialData } from "./data/initial";

const INITIAL_DATA_TIMEOUT_MS = 4000;

async function main() {
  // useAsyncResource only checks initialData on first render; data loaded in a
  // post-mount effect is never seen. Fetch and render in one shot instead — but
  // don't block first paint indefinitely on two sequential Jolpica calls. Race
  // against a timeout and render without initialData if it loses; the hooks
  // fetch their own data client-side either way.
  const loaded = loadInitialData().catch((err: unknown) => {
    console.error("loadInitialData failed", err);
    return undefined;
  });
  const timedOut = new Promise<undefined>((resolve) =>
    setTimeout(() => resolve(undefined), INITIAL_DATA_TIMEOUT_MS),
  );
  const initialData: DemoInitialData | undefined = await Promise.race([loaded, timedOut]);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App initialData={initialData} />
    </StrictMode>,
  );
}

void main();

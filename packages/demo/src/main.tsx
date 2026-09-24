import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadInitialData, type DemoInitialData } from "./data/initial";

async function main() {
  // useAsyncResource only checks initialData on first render; data loaded in a
  // post-mount effect is never seen. Fetch and render in one shot instead.
  let initialData: DemoInitialData | undefined;
  try {
    initialData = await loadInitialData();
  } catch {
    initialData = undefined;
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App initialData={initialData} />
    </StrictMode>,
  );
}

void main();

import { Console } from "./app/Console";
import type { DemoInitialData } from "./data/initial";

export default function App({ initialData }: { initialData?: DemoInitialData }) {
  return <Console initialData={initialData} />;
}

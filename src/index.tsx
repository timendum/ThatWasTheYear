import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

createRoot(document.querySelector("#root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

import { registerSW } from 'virtual:pwa-register';

// Register service worker for auto-updates
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);

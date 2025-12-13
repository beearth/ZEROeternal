
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import("./index_debug.css"); // CSS included asynchronously for debugging

createRoot(document.getElementById("root")!).render(<App />);

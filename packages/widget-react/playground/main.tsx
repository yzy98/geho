import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ChatWidget } from "../src";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const apiUrl = import.meta.env.VITE_WIDGET_API_URL;
const embedKey = import.meta.env.VITE_WIDGET_EMBED_KEY;

if (!(apiUrl && embedKey)) {
  throw new Error(
    "VITE_WIDGET_API_URL and VITE_WIDGET_EMBED_KEY are required."
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <ChatWidget apiUrl={apiUrl} embedKey={embedKey} />
  </StrictMode>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OmikujiApp } from "@/src/components/OmikujiApp";
import "@/app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OmikujiApp />
  </StrictMode>,
);

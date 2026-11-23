import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/bowlby-one/400.css";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "./app/app.css";
import App from "./app/App";

createRoot(document.getElementById("root")!).render(<App />);

import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/bowlby-one/400.css";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "./app.css";
import App from "../App";

createRoot(document.getElementById("root")!).render(<App />);

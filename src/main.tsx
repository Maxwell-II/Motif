import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import MainWindow from "./windows/MainWindow";
import CaptureWindow from "./windows/CaptureWindow";
import "./index.css";

const label = getCurrentWindow().label;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {label === "capture" ? <CaptureWindow /> : <MainWindow />}
  </React.StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main style={{fontFamily:"system-ui",padding:40}}>
      <h1>BEST OF ALL AI</h1>
      <p>Vite production build test.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);

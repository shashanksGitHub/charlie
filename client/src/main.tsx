import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeBrowserCompat } from "@/utils/safari-transform-fix";
import { nationalityDemonymMap } from './hooks/use-nationality';

// Initialize global message deduplication system
import "./lib/message-deduplication";

// The message deduplication system is automatically initialized when imported

// Initialize nationality system and demonym mapping for global use
// This makes the nationality demonyms available to the translation system
window.__nationalities = nationalityDemonymMap;

// Log that we're initializing the app with deduplication active
console.log("[APP] Message persistence system initialized:", 
  typeof window.__meetMessageDeduplicationCache !== 'undefined');

// Log that we're initializing the nationality system
console.log("[APP] Nationality system initialized with", 
  Object.keys(nationalityDemonymMap).length, "country mappings");

// Initialize browser compatibility fixes for Safari/Edge
initializeBrowserCompat();

createRoot(document.getElementById("root")!).render(<App />);

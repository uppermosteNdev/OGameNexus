import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Suppress known Recharts ResponsiveContainer sizing warning during mount transitions
const _origWarn = console.warn;
console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('of chart should be greater than 0')) return;
    _origWarn.apply(console, args);
};

const rootElement = document.getElementById("root");
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

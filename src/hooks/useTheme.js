import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "groundwork:theme";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) {}
  // Fall back to the visitor's OS-level preference if they've never toggled it.
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

// Shared across every component that calls this hook — so toggling in the
// header updates every page instantly without needing a Context provider.
let currentTheme = null;
const listeners = new Set();

function applyTheme(theme) {
  currentTheme = theme;
  try {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {}
  listeners.forEach((fn) => fn(theme));
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => currentTheme || getInitialTheme());

  useEffect(() => {
    if (currentTheme === null) {
      applyTheme(getInitialTheme());
    } else {
      document.documentElement.setAttribute("data-theme", currentTheme);
    }
    const listener = (t) => setThemeState(t);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme((currentTheme === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}

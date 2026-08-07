"use client";
import { useEffect, useState } from "react";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "sumi-theme";
const CYCLE: Theme[] = ["light", "dark", "system"];

/** Apply a theme to <html>; matches the guards in globals.css. */
function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.removeAttribute("data-theme");
  if (theme === "light") {
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }
}

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Desktop,
};

const LABELS: Record<Theme, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    // Initial state must match SSR ("system"); the saved theme is applied
    // after hydration (the head script already painted it pre-render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(saved);
    apply(saved);
  }, []);

  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      className="press flex items-center justify-center rounded-full p-2 text-ink-faint transition-colors hover:text-ink"
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
      onClick={() => {
        const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
        setTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
        apply(next);
      }}
    >
      <Icon size={16} weight="duotone" aria-hidden />
    </button>
  );
}

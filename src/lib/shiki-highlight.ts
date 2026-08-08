import { createHighlighter } from "shiki";

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark-dimmed";

/** Canonical languages loaded into the bundled highlighter. */
const LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "css",
  "markdown",
  "bash",
  "sql",
  "yaml",
  "diff",
  "python",
  "html",
  "text",
] as const;

const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  md: "markdown",
  py: "python",
  yml: "yaml",
  txt: "text",
  plaintext: "text",
  console: "text",
};

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({ themes: [LIGHT_THEME, DARK_THEME], langs: [...LANGS] });
  return highlighterPromise;
}

function normalizeLang(lang: string): string {
  const l = lang.toLowerCase();
  if (ALIASES[l]) return ALIASES[l];
  return (LANGS as readonly string[]).includes(l) ? l : "text";
}

/**
 * Highlight a fenced code block with Shiki. Colors are emitted as per-token
 * CSS variables (`--shiki-light` / `--shiki-dark`); the page theme decides
 * which set applies (see the `.shiki` rules in globals.css).
 */
export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: normalizeLang(lang),
    themes: { light: LIGHT_THEME, dark: DARK_THEME },
    defaultColor: false,
  });
}

import { createElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingSlug } from "@/lib/heading-slug";
import { highlightCode } from "@/lib/shiki-highlight";
import { CodeBlockCopy } from "@/components/code-block-copy";
import { MarkdownImage } from "@/components/markdown-image";

/**
 * Resolve a URL against a base. If `src` is already absolute (starts with
 * a scheme or "/") it is returned unchanged. Otherwise `base + src` is used.
 * When `base` is undefined the original `src` is returned unchanged.
 */
export function resolveUrl(base: string | undefined, src: string): string {
  if (!base) return src;
  if (src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")) return src;
  return base + src;
}

/** Flatten a React node tree to plain text (for heading anchor ids). */
function headingText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(headingText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return headingText(props?.children);
  }
  return "";
}

function makeHeading(tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  return function Heading({ children }: { children?: ReactNode }) {
    const id = headingSlug(headingText(children));
    const text = headingText(children);
    // scroll-mt keeps anchor jumps clear of the sticky nav; the trailing
    // "#" anchor links to the heading itself and appears on hover.
    return createElement(
      tag,
      { id, className: "scroll-mt-24 group/heading" },
      children,
      createElement(
        "a",
        {
          href: `#${id}`,
          "aria-label": `Link to ${text}`,
          className: "heading-anchor",
        },
        "#",
      ),
    );
  };
}

const headingComponents = {
  h1: makeHeading("h1"),
  h2: makeHeading("h2"),
  h3: makeHeading("h3"),
  h4: makeHeading("h4"),
  h5: makeHeading("h5"),
  h6: makeHeading("h6"),
};

/** Fenced code block rendered as a Shiki-highlighted `<pre>` (server side). */
async function HighlightedCode({ lang, code }: { lang: string; code: string }) {
  const html = await highlightCode(code, lang);
  return (
    <div className="my-4">
      <div className="code-well">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-deep/60 px-4 py-2">
          <span className="min-w-0 truncate font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
            {lang || "code"}
          </span>
          <CodeBlockCopy code={code} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

function Code({ className, children }: { className?: string; children?: ReactNode }) {
  const match = /language-([\w-]+)/.exec(className ?? "");
  const lang = match?.[1];
  if (lang) {
    return <HighlightedCode lang={lang} code={String(children ?? "").replace(/\n$/, "")} />;
  }
  return <code className={className}>{children}</code>;
}

/** Renders a Markdown string to sanitized HTML (no raw HTML passthrough). */
export function Markdown({
  children,
  baseUrl,
  zoomable = true,
}: {
  children: string;
  baseUrl?: string;
  /** Click-to-zoom on body images; disable for compact contexts (comments). */
  zoomable?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ...headingComponents,
        // Wide tables (esp. on mobile) scroll inside their own container
        // instead of blowing out the article column.
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-card border border-line">
            <table>{children}</table>
          </div>
        ),
        // Fenced blocks are replaced by Shiki's own <pre>; the default
        // wrapper is dropped to avoid nesting.
        pre: ({ children }) => <>{children}</>,
        code: Code,
        // Body figures load off the critical path; decode async so long
        // articles with many screenshots don't jank on scroll.
        img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} zoomable={zoomable} />,
      }}
      urlTransform={(url, key) => {
        if (key === "src") return resolveUrl(baseUrl, url);
        return url;
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

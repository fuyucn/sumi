import { createElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingSlug } from "@/lib/heading-slug";
import { highlightCode } from "@/lib/shiki-highlight";

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
    // scroll-mt keeps anchor jumps clear of the sticky nav.
    return createElement(tag, { id: headingSlug(headingText(children)), className: "scroll-mt-24" }, children);
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
  return <div className="my-4" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Code({ className, children }: { className?: string; children?: ReactNode }) {
  const match = /language-([\w-]+)/.exec(className ?? "");
  const lang = match?.[1];
  const code = String(children ?? "").replace(/\n$/, "");
  if (lang && code.includes("\n")) {
    return <HighlightedCode lang={lang} code={code} />;
  }
  return <code className={className}>{children}</code>;
}

/** Renders a Markdown string to sanitized HTML (no raw HTML passthrough). */
export function Markdown({ children, baseUrl }: { children: string; baseUrl?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ...headingComponents,
        // Wide tables (esp. on mobile) scroll inside their own container
        // instead of blowing out the article column.
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table>{children}</table>
          </div>
        ),
        // Fenced blocks are replaced by Shiki's own <pre>; the default
        // wrapper is dropped to avoid nesting.
        pre: ({ children }) => <>{children}</>,
        code: Code,
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

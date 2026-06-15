import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

/** Renders a Markdown string to sanitized HTML (no raw HTML passthrough). */
export function Markdown({ children, baseUrl }: { children: string; baseUrl?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url, key) => {
        if (key === "src") return resolveUrl(baseUrl, url);
        return url;
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

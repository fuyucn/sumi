import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders a Markdown string to sanitized HTML (no raw HTML passthrough). */
export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}

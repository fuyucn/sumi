"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";

export function Editor({
  initialMarkdown = "",
  onChange,
}: {
  initialMarkdown?: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialMarkdown,
    immediatelyRender: false, // avoid SSR hydration mismatch under Next App Router
    onUpdate: ({ editor }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange((editor.storage as any).markdown.getMarkdown()),
  });

  useEffect(() => {
    if (editor)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange((editor.storage as any).markdown.getMarkdown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 6,
        padding: "0.75rem",
        minHeight: 240,
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

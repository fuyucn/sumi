"use client";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { useEffect } from "react";

// @tiptap/core v3 types `editor.storage` as the DOM Storage interface, so the
// markdown extension's storage isn't visible. Narrow it to its real shape.
function toMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
}

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
    onUpdate: ({ editor }) => onChange(toMarkdown(editor)),
  });

  useEffect(() => {
    if (editor) onChange(toMarkdown(editor));
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

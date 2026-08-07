"use client";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import { headingSlug } from "@/lib/heading-slug";

// @tiptap/core v3 types `editor.storage` as the DOM Storage interface, so the
// markdown extension's storage isn't visible. Narrow it to its real shape.
function toMarkdown(editor: TiptapEditor): string {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
}

/**
 * Heading with a stable anchor id (same slug algorithm as the article page),
 * so the AI 导读 anchor links can jump to sections inside the editor preview.
 */
const HeadingWithAnchors = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const id = headingSlug(node.textContent ?? "");
    const cls = `${HTMLAttributes.class ?? ""} scroll-mt-24`.trim();
    return [`h${node.attrs.level as number}`, { ...HTMLAttributes, id, class: cls }, 0];
  },
});

export function Editor({
  initialMarkdown = "",
  onChange,
  uploadImage,
}: {
  initialMarkdown?: string;
  onChange: (markdown: string) => void;
  uploadImage?: (file: File) => Promise<string | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false }), HeadingWithAnchors, Markdown, Image],
    content: initialMarkdown,
    immediatelyRender: false, // avoid SSR hydration mismatch under Next App Router
    onUpdate: ({ editor }) => onChange(toMarkdown(editor)),
  });

  useEffect(() => {
    if (editor) onChange(toMarkdown(editor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor || !uploadImage) return;
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
    const path = await uploadImage(file);
    if (path) {
      editor.chain().focus().setImage({ src: path }).run();
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-6">
      {uploadImage && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            + Add image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
      <div className="prose max-w-none min-h-[50vh] font-serif prose-headings:font-serif focus-within:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

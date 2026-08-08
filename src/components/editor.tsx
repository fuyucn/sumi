"use client";
import {
  EditorContent,
  useEditor,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import { headingSlug } from "@/lib/heading-slug";
import {
  Code,
  Image as ImageIcon,
  ListBullets,
  ListNumbers,
  Quotes,
  TextB,
  TextHOne,
  TextHTwo,
  TextHThree,
  TextItalic,
  TextStrikethrough,
} from "@phosphor-icons/react";

/** ⌘ on macOS, Ctrl elsewhere. BubbleMenu only renders client-side. */
function modKey(): "⌘" | "Ctrl" {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";
}

// @tiptap/core v3 types `editor.storage` as the DOM Storage interface, so the
// markdown extension's storage isn't visible. Narrow it to its real shape.
function toMarkdown(editor: TiptapEditor): string {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
}

/**
 * Heading with a stable anchor id (same slug algorithm as the article page),
 * so the AI 总结 anchor links can jump to sections inside the editor preview.
 */
const HeadingWithAnchors = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const id = headingSlug(node.textContent ?? "");
    const cls = `${HTMLAttributes.class ?? ""} scroll-mt-24`.trim();
    return [`h${node.attrs.level as number}`, { ...HTMLAttributes, id, class: cls }, 0];
  },
});

function ToolBtn({
  label,
  shortcut,
  active,
  onMouseDown,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onMouseDown: () => void;
  children: React.ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onMouseDown={(e) => {
        // Prevent the editor from losing focus when clicking a tool button.
        e.preventDefault();
        onMouseDown();
      }}
      className={`grid size-8 place-items-center rounded-full transition-[color,background-color,transform] duration-[var(--dur-short)] ease-[var(--ease-out)] active:scale-90 ${
        active
          ? "bg-seal/10 text-seal"
          : "text-ink-soft hover:bg-ink/[0.05] hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const mod = modKey();
  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-line-strong bg-paper/95 px-1.5 py-1 shadow-pop backdrop-blur-md"
      style={{ animation: "bubble-pop 0.22s var(--ease-out)" }}
    >
      <ToolBtn
        label="Bold"
        shortcut={`${mod}B`}
        active={editor.isActive("bold")}
        onMouseDown={() => editor.chain().focus().toggleBold().run()}
      >
        <TextB size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Italic"
        shortcut={`${mod}I`}
        active={editor.isActive("italic")}
        onMouseDown={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalic size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Strikethrough"
        shortcut={`${mod}⇧X`}
        active={editor.isActive("strike")}
        onMouseDown={() => editor.chain().focus().toggleStrike().run()}
      >
        <TextStrikethrough size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Inline code"
        shortcut={`${mod}E`}
        active={editor.isActive("code")}
        onMouseDown={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} weight="bold" aria-hidden />
      </ToolBtn>

      <span aria-hidden className="mx-1 h-5 w-px bg-line-strong" />

      <ToolBtn
        label="Paragraph"
        shortcut={`${mod}⌥0`}
        active={editor.isActive("paragraph")}
        onMouseDown={() => editor.chain().focus().setParagraph().run()}
      >
        <span className="font-serif text-[13px] font-semibold leading-none">¶</span>
      </ToolBtn>
      <ToolBtn
        label="Heading 1"
        shortcut={`${mod}⌥1`}
        active={editor.isActive("heading", { level: 1 })}
        onMouseDown={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <TextHOne size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Heading 2"
        shortcut={`${mod}⌥2`}
        active={editor.isActive("heading", { level: 2 })}
        onMouseDown={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <TextHTwo size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Heading 3"
        shortcut={`${mod}⌥3`}
        active={editor.isActive("heading", { level: 3 })}
        onMouseDown={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <TextHThree size={16} weight="bold" aria-hidden />
      </ToolBtn>

      <span aria-hidden className="mx-1 h-5 w-px bg-line-strong" />

      <ToolBtn
        label="Bullet list"
        shortcut={`${mod}⇧8`}
        active={editor.isActive("bulletList")}
        onMouseDown={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBullets size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Numbered list"
        shortcut={`${mod}⇧7`}
        active={editor.isActive("orderedList")}
        onMouseDown={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListNumbers size={16} weight="bold" aria-hidden />
      </ToolBtn>
      <ToolBtn
        label="Blockquote"
        shortcut={`${mod}⇧B`}
        active={editor.isActive("blockquote")}
        onMouseDown={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quotes size={16} weight="bold" aria-hidden />
      </ToolBtn>
    </div>
  );
}

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
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">
            Select text to reveal formatting tools.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs text-ink-muted transition-[color,border-color,background-color] duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-seal/40 hover:bg-seal/[0.04] hover:text-seal"
          >
            <ImageIcon size={14} aria-hidden />
            Add image
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
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{
            placement: "top",
            offset: 8,
          }}
          shouldShow={({ editor: ed, state }) => {
            if (!ed.isEditable || ed.isDestroyed) return false;
            const { selection } = state;
            if (!selection.empty) return true;
            // From a bare caret, still allow toggling heading/list/quote
            // structure without selecting the whole block first.
            return (
              ed.isActive("heading") ||
              ed.isActive("bulletList") ||
              ed.isActive("orderedList") ||
              ed.isActive("blockquote")
            );
          }}
        >
          <div style={{ animation: "fade-in 0.18s var(--ease-out)" }}>
            <Toolbar editor={editor} />
          </div>
        </BubbleMenu>
      )}
      <div className="prose max-w-none min-h-[50vh] font-serif prose-headings:font-serif focus-within:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

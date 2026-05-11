import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Quote, Code, Link2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string, plain: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "내용을 입력하세요..." }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-[#6366F1] underline" } }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[280px] px-4 py-3 focus:outline-none text-[#111318] prose-headings:text-[#111318] prose-strong:text-[#111318] prose-a:text-[#6366F1]",
      },
    },
  });

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-2 rounded-md transition-colors ${active ? "bg-[#6366F1]/20 text-[#6366F1]" : "text-[#8b8f98] hover:text-[#111318] hover:bg-[#f7f8fa]"}`;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] overflow-hidden">
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-[#eef0f3]">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} aria-label="굵게">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} aria-label="기울임">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} aria-label="목록">
          <List className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} aria-label="번호 목록">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} aria-label="인용">
          <Quote className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive("codeBlock"))} aria-label="코드">
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt("링크 URL 입력");
            if (!url) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          className={btn(editor.isActive("link"))}
          aria-label="링크"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

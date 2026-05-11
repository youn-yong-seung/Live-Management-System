import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Quote, Code, Link2, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  value: string;
  onChange: (html: string, plain: string) => void;
  placeholder?: string;
}

async function uploadImage(file: File): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/community/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { url: string };
  return json.url;
}

export function TipTapEditor({ value, onChange, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: "tiptap-code-block" } },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "내용을 입력하세요. 코드/프롬프트는 ``` 또는 도구막대로." }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-[#6366F1] underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-md max-w-full my-3" } }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none min-h-[280px] px-4 py-3 focus:outline-none text-[#111318] prose-headings:text-[#111318] prose-strong:text-[#111318] prose-a:text-[#6366F1] prose-code:bg-[#f7f8fa] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:hidden prose-code:after:hidden prose-pre:bg-[#0f172a] prose-pre:text-[#e2e8f0]",
      },
    },
  });

  if (!editor) return null;

  const handleImageButton = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      alert("이미지 업로드 실패. 로그인 상태 확인.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const btn = (active: boolean) =>
    `p-2 rounded-md transition-colors ${active ? "bg-[#6366F1]/15 text-[#6366F1]" : "text-[#8b8f98] hover:text-[#111318] hover:bg-[#f7f8fa]"}`;

  return (
    <div className="rounded-md border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-[#eef0f3] bg-[#fafbfc]">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} aria-label="굵게">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} aria-label="기울임">
          <Italic className="h-4 w-4" />
        </button>
        <span className="w-px bg-[#e5e7eb] mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} aria-label="목록">
          <List className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} aria-label="번호 목록">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} aria-label="인용">
          <Quote className="h-4 w-4" />
        </button>
        <span className="w-px bg-[#e5e7eb] mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={btn(editor.isActive("codeBlock"))}
          aria-label="코드 블록"
          title="코드 블록 — 프롬프트·코드 공유"
        >
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
        <span className="w-px bg-[#e5e7eb] mx-1" />
        <button
          type="button"
          onClick={handleImageButton}
          disabled={uploading}
          className={btn(false)}
          aria-label="이미지"
          title="이미지 업로드 — 만든 거 자랑할 때"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

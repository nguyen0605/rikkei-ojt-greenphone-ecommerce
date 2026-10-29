import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon, Quote, Undo2, Redo2, RemoveFormatting } from 'lucide-react';

interface TiptapRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/* Rich-text editor (Tiptap + StarterKit) — dùng trong admin để soạn HTML nội dung. */

export default function TiptapRichEditor({ value, onChange, placeholder }: TiptapRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[200px] rounded-b-xl border border-t-0 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none',
      },
    },
    immediatelyRender: false,
  });

  // Đồng bộ khi giá trị ngoài đổi (load lại từ DB)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const ToolButton = ({ active, onClick, disabled, children, title }: {
    active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string;
  }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
        active ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập URL:', prev || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <ToolButton title="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Tiêu đề" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Danh sách gạch" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Danh sách số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Chèn link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Xóa định dạng" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolButton>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <ToolButton title="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolButton>
      </div>
      {/* Content */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}

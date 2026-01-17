'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Toolbar button styles
const toolbarButtonStyle = {
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '14px',
  color: '#2A4759',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '32px',
  height: '32px',
};

const activeButtonStyle = {
  ...toolbarButtonStyle,
  background: '#3FC1C9',
  color: 'white',
  borderColor: '#3FC1C9',
};

const colorOptions = [
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#dc3545' },
  { label: 'Green', value: '#28a745' },
  { label: 'Blue', value: '#007bff' },
  { label: 'Orange', value: '#fd7e14' },
  { label: 'Purple', value: '#6f42c1' },
];

export default function RichTextEditor({ value, onChange, placeholder = "What's on your mind?" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        style: `
          min-height: 150px;
          padding: 0.75rem 1rem;
          outline: none;
          font-size: 1rem;
          color: #2A4759;
          font-family: var(--font-primary), sans-serif;
        `,
      },
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const getPlainTextLength = () => {
    return editor.getText().length;
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      overflow: 'hidden',
      background: 'white'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '8px 12px',
        borderBottom: '1px solid #eee',
        background: '#f8f9fa',
      }}>
        {/* Text Formatting */}
        <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={editor.isActive('bold') ? activeButtonStyle : toolbarButtonStyle}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={editor.isActive('italic') ? activeButtonStyle : toolbarButtonStyle}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={editor.isActive('underline') ? activeButtonStyle : toolbarButtonStyle}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            style={editor.isActive('strike') ? activeButtonStyle : toolbarButtonStyle}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }} />

        {/* Lists */}
        <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={editor.isActive('bulletList') ? activeButtonStyle : toolbarButtonStyle}
            title="Bullet List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="6" x2="20" y2="6"></line>
              <line x1="9" y1="12" x2="20" y2="12"></line>
              <line x1="9" y1="18" x2="20" y2="18"></line>
              <circle cx="4" cy="6" r="2" fill="currentColor"></circle>
              <circle cx="4" cy="12" r="2" fill="currentColor"></circle>
              <circle cx="4" cy="18" r="2" fill="currentColor"></circle>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={editor.isActive('orderedList') ? activeButtonStyle : toolbarButtonStyle}
            title="Numbered List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="21" y2="6"></line>
              <line x1="10" y1="12" x2="21" y2="12"></line>
              <line x1="10" y1="18" x2="21" y2="18"></line>
              <text x="2" y="7" fontSize="6" fill="currentColor" stroke="none">1</text>
              <text x="2" y="13" fontSize="6" fill="currentColor" stroke="none">2</text>
              <text x="2" y="19" fontSize="6" fill="currentColor" stroke="none">3</text>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }} />

        {/* Text Alignment */}
        <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            style={editor.isActive({ textAlign: 'left' }) ? activeButtonStyle : toolbarButtonStyle}
            title="Align Left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="15" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            style={editor.isActive({ textAlign: 'center' }) ? activeButtonStyle : toolbarButtonStyle}
            title="Align Center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="6" y1="12" x2="18" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            style={editor.isActive({ textAlign: 'right' }) ? activeButtonStyle : toolbarButtonStyle}
            title="Align Right"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="9" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }} />

        {/* Text Color */}
        <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
          <select
            onChange={(e) => {
              if (e.target.value) {
                editor.chain().focus().setColor(e.target.value).run();
              }
            }}
            style={{
              ...toolbarButtonStyle,
              padding: '4px 8px',
              minWidth: '80px',
              cursor: 'pointer',
            }}
            title="Text Color"
            defaultValue=""
          >
            <option value="" disabled>Color</option>
            {colorOptions.map((color) => (
              <option key={color.value} value={color.value} style={{ color: color.value }}>
                {color.label}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }} />

        {/* Undo/Redo */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            style={{
              ...toolbarButtonStyle,
              opacity: editor.can().undo() ? 1 : 0.5,
              cursor: editor.can().undo() ? 'pointer' : 'not-allowed',
            }}
            title="Undo (Ctrl+Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            style={{
              ...toolbarButtonStyle,
              opacity: editor.can().redo() ? 1 : 0.5,
              cursor: editor.can().redo() ? 'pointer' : 'not-allowed',
            }}
            title="Redo (Ctrl+Y)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6"></path>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }} />

        {/* Clear Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          style={toolbarButtonStyle}
          title="Clear Formatting"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3"></path>
            <path d="M9 20h6"></path>
            <path d="M12 4v16"></path>
            <line x1="3" y1="21" x2="21" y2="3" stroke="#dc3545" strokeWidth="2"></line>
          </svg>
        </button>
      </div>

      {/* Editor Content */}
      <div style={{ position: 'relative' }}>
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            left: '1rem',
            color: '#999',
            pointerEvents: 'none',
            fontSize: '1rem',
            fontFamily: 'var(--font-primary), sans-serif',
          }}>
            {placeholder}
          </div>
        )}
      </div>

      {/* Character Count */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #eee',
        background: '#f8f9fa',
        fontSize: '0.875rem',
        color: '#666',
      }}>
        {getPlainTextLength()} / 5000 characters
      </div>

      {/* Editor Styles */}
      <style jsx global>{`
        .rich-text-editor-content {
          min-height: 150px;
        }
        .rich-text-editor-content p {
          margin: 0 0 0.5em 0;
        }
        .rich-text-editor-content p:last-child {
          margin-bottom: 0;
        }
        .rich-text-editor-content ul,
        .rich-text-editor-content ol {
          padding-left: 1.5rem;
          margin: 0.5em 0;
        }
        .rich-text-editor-content li {
          margin: 0.25em 0;
        }
        .rich-text-editor-content strong {
          font-weight: 700;
        }
        .rich-text-editor-content em {
          font-style: italic;
        }
        .rich-text-editor-content u {
          text-decoration: underline;
        }
        .rich-text-editor-content s {
          text-decoration: line-through;
        }
        .ProseMirror {
          min-height: 150px;
          padding: 0.75rem 1rem;
          outline: none;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}

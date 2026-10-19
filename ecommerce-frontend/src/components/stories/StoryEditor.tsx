"use client";
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { StoryNode } from './types';
import s from './story-editor.module.css';
export default function StoryEditor({ value, onChange }: { value: StoryNode; onChange: (value: StoryNode) => void }) {
  const editor = useEditor({ extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, link: { openOnClick: false, autolink: false, protocols: ['http', 'https'] } })], content: value, immediatelyRender: false, onUpdate: ({ editor }) => onChange(editor.getJSON() as StoryNode), editorProps: { attributes: { 'aria-label': 'Article content', class: s.content } } });
  useEditorState({ editor, selector: ({ editor }) => editor ? { bold: editor.isActive('bold'), italic: editor.isActive('italic'), heading: editor.getAttributes('heading').level, bullet: editor.isActive('bulletList'), ordered: editor.isActive('orderedList'), quote: editor.isActive('blockquote'), link: editor.isActive('link'), undo: editor.can().undo(), redo: editor.can().redo() } : null });
  if (!editor) return <div className={s.loading}>Loading editor…</div>;
  function link() {
    if (!editor) return;
    const value = window.prompt('Link URL (https://… or /page)', editor.getAttributes('link').href || 'https://');
    if (value === null) return;
    if (!value.trim()) { editor.chain().focus().unsetLink().run(); return; }
    if (!/^(https?:\/\/|\/(?!\/))/i.test(value) || /[\x00-\x20\\]/.test(value)) { window.alert('Use an http, https, or local website link.'); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
  }
  return <div className={s.editor}><div className={s.toolbar} role="toolbar" aria-label="Article formatting"><select aria-label="Text style" value={editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'paragraph'} onChange={event => { if (event.target.value === 'paragraph') editor.chain().focus().setParagraph().run(); else editor.chain().focus().setHeading({ level: Number(event.target.value) as 2 | 3 | 4 }).run(); }}><option value="paragraph">Paragraph</option><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option></select>
    <button type="button" aria-label="Bold" aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button><button type="button" aria-label="Italic" aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button><button type="button" aria-label="Bullet list" aria-pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button><button type="button" aria-label="Numbered list" aria-pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button><button type="button" aria-pressed={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button><button type="button" aria-pressed={editor.isActive('link')} onClick={link}>Link</button><button type="button" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')}>Unlink</button><button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>Divider</button><button type="button" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>Undo</button><button type="button" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>Redo</button></div><EditorContent editor={editor} /><p className={s.note}>Headings, paragraphs, and lists use the site’s article styles. Paste text directly; fonts and colors stay consistent.</p></div>;
}

 import { useEditor, EditorContent } from '@tiptap/react';
 import StarterKit from '@tiptap/starter-kit';
 import Link from '@tiptap/extension-link';
 import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
 import Color from '@tiptap/extension-color';
 import Highlight from '@tiptap/extension-highlight';
 import { Button } from './button';
 import { 
   Bold, 
   Italic, 
   Underline, 
   Strikethrough, 
   List, 
   ListOrdered, 
   Quote, 
   Code,
   Link as LinkIcon,
   Image as ImageIcon,
   Undo,
   Redo,
   Heading1,
   Heading2,
   Heading3
 } from 'lucide-react';
 import { useEffect } from 'react';
 import DOMPurify from 'dompurify';
 
 interface RichTextEditorProps {
   value: string;
   onChange: (content: string) => void;
   className?: string;
 }
 
 export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
   const editor = useEditor({
     extensions: [
       StarterKit.configure({
         heading: {
           levels: [1, 2, 3],
         },
       }),
       Link.configure({
         openOnClick: false,
         HTMLAttributes: {
           rel: 'noopener noreferrer nofollow',
         },
       }),
       Image.configure({
         HTMLAttributes: {
           loading: 'lazy',
         },
       }),
       TextStyle,
       Color,
       Highlight.configure({
         multicolor: true,
       }),
     ],
     content: value,
     onUpdate: ({ editor }) => {
       // Sanitize output before passing to parent
       const html = editor.getHTML();
       onChange(DOMPurify.sanitize(html));
     },
     editorProps: {
       attributes: {
         class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 dark:prose-invert',
       },
     },
   });
 
   // Sync external value changes
   useEffect(() => {
     if (editor && value !== editor.getHTML()) {
       editor.commands.setContent(DOMPurify.sanitize(value));
     }
   }, [value, editor]);
 
   if (!editor) {
     return null;
   }
 
   const addLink = () => {
     const url = window.prompt('Enter URL');
     if (url) {
       // Validate URL to prevent javascript: protocol
       try {
         const parsed = new URL(url);
         if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
           editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
         } else {
           alert('Only http:// and https:// URLs are allowed');
         }
       } catch {
         alert('Invalid URL');
       }
     }
   };
 
   const addImage = () => {
     const url = window.prompt('Enter image URL');
     if (url) {
       // Validate URL
       try {
         const parsed = new URL(url);
         if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
           editor.chain().focus().setImage({ src: url }).run();
         } else {
           alert('Only http:// and https:// URLs are allowed');
         }
       } catch {
         alert('Invalid URL');
       }
     }
   };
 
   return (
     <div className={`border rounded-md bg-background ${className}`}>
       {/* Toolbar */}
       <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
           className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
         >
           <Heading1 className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
           className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
         >
           <Heading2 className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
           className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
         >
           <Heading3 className="h-4 w-4" />
         </Button>
         
         <div className="w-px h-6 bg-border mx-1" />
         
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleBold().run()}
           className={editor.isActive('bold') ? 'bg-accent' : ''}
         >
           <Bold className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleItalic().run()}
           className={editor.isActive('italic') ? 'bg-accent' : ''}
         >
           <Italic className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleStrike().run()}
           className={editor.isActive('strike') ? 'bg-accent' : ''}
         >
           <Strikethrough className="h-4 w-4" />
         </Button>
         
         <div className="w-px h-6 bg-border mx-1" />
         
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleBulletList().run()}
           className={editor.isActive('bulletList') ? 'bg-accent' : ''}
         >
           <List className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleOrderedList().run()}
           className={editor.isActive('orderedList') ? 'bg-accent' : ''}
         >
           <ListOrdered className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleBlockquote().run()}
           className={editor.isActive('blockquote') ? 'bg-accent' : ''}
         >
           <Quote className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleCodeBlock().run()}
           className={editor.isActive('codeBlock') ? 'bg-accent' : ''}
         >
           <Code className="h-4 w-4" />
         </Button>
         
         <div className="w-px h-6 bg-border mx-1" />
         
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={addLink}
           className={editor.isActive('link') ? 'bg-accent' : ''}
         >
           <LinkIcon className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={addImage}
         >
           <ImageIcon className="h-4 w-4" />
         </Button>
         
         <div className="w-px h-6 bg-border mx-1" />
         
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().undo().run()}
           disabled={!editor.can().undo()}
         >
           <Undo className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().redo().run()}
           disabled={!editor.can().redo()}
         >
           <Redo className="h-4 w-4" />
         </Button>
       </div>
       
       {/* Editor Content */}
       <EditorContent editor={editor} />
     </div>
   );
 }
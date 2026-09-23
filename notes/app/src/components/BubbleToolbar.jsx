import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Underline, Strikethrough, List } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

export default function BubbleToolbar({ editor }) {
  const isMobile = useIsMobile();
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => !state.selection.empty}
      className="flex items-center gap-0.5 rounded border border-border bg-list-bg p-1 shadow-lg"
    >
      <BubbleBtn editor={editor} mark="bold" icon={Bold} />
      <BubbleBtn editor={editor} mark="italic" icon={Italic} />
      <BubbleBtn editor={editor} mark="underline" icon={Underline} />
      <BubbleBtn editor={editor} mark="strike" icon={Strikethrough} />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={
          'flex h-7 w-7 items-center justify-center rounded ' +
          (editor.isActive('bulletList') ? 'bg-black/10' : 'hover:bg-black/5')
        }
      >
        <List size={isMobile ? 18 : 15} strokeWidth={1.8} />
      </button>
    </BubbleMenu>
  );
}

function BubbleBtn({ editor, mark, icon: Icon }) {
  const active = editor.isActive(mark);
  const isMobile = useIsMobile();
  return (
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleMark(mark).run()}
      className={'flex h-7 w-7 items-center justify-center rounded ' + (active ? 'bg-black/10' : 'hover:bg-black/5')}
    >
      <Icon size={isMobile ? 18 : 15} strokeWidth={1.8} />
    </button>
  );
}

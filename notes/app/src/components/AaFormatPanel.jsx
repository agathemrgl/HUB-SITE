import { useState } from 'react';

const BLOCKS = [
  { key: 'h1', label: 'Titre', className: 'text-[19px] font-bold' },
  { key: 'h2', label: 'Sous-titre', className: 'text-[15px] font-bold' },
  { key: 'h3', label: 'Titre secondaire', className: 'text-[13px] font-bold' },
  { key: 'p', label: 'Corps', className: 'text-[13px]' },
  { key: 'mono', label: 'Monostyle', className: 'text-[13px] font-mono' },
];

function isBlockActive(editor, key) {
  if (!editor) return false;
  if (key === 'p') return editor.isActive('paragraph');
  if (key === 'mono') return editor.isActive('codeBlock');
  if (key.startsWith('h')) return editor.isActive('heading', { level: Number(key[1]) });
  return false;
}

function applyBlock(editor, key) {
  const chain = editor.chain().focus();
  if (key === 'p') chain.setParagraph().run();
  else if (key === 'mono') chain.toggleCodeBlock().run();
  else chain.toggleHeading({ level: Number(key[1]) }).run();
}

export default function AaFormatPanel({ editor }) {
  const [open, setOpen] = useState(false);

  if (!editor) return null;

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        title="Format du texte"
        className="flex h-7 w-7 items-center justify-center rounded text-[13px] font-semibold text-text-primary/70 hover:bg-black/5"
      >
        Aa
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-20 w-56 rounded border border-border bg-list-bg p-1.5 shadow-lg">
          <div className="flex items-center gap-0.5 pb-1.5">
            <StyleBtn editor={editor} mark="bold" label={<strong>B</strong>} />
            <StyleBtn editor={editor} mark="italic" label={<em>I</em>} />
            <StyleBtn editor={editor} mark="underline" label={<span className="underline">U</span>} />
            <StyleBtn editor={editor} mark="strike" label={<span className="line-through">S</span>} />
          </div>
          <div className="mb-1.5 border-t border-border" />
          <div className="flex flex-col gap-0.5">
            {BLOCKS.map((b) => {
              const active = isBlockActive(editor, b.key);
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => applyBlock(editor, b.key)}
                  className={
                    'relative rounded py-1.5 pl-6 pr-2 text-left hover:bg-black/5 ' + b.className
                  }
                >
                  {active && <span className="absolute left-1.5 text-xs font-semibold">✓</span>}
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="my-1.5 border-t border-border" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="w-full rounded py-1.5 pl-6 pr-2 text-left text-[13px] text-text-secondary hover:bg-black/5"
          >
            ❙ Bloc de citation
          </button>
        </div>
      )}
    </div>
  );
}

function StyleBtn({ editor, mark, label }) {
  const active = editor.isActive(mark);
  return (
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleMark(mark).run()}
      className={'flex h-7 flex-1 items-center justify-center rounded text-[13px] ' + (active ? 'bg-black/10' : 'hover:bg-black/5')}
    >
      {label}
    </button>
  );
}

import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';

// Source unique de configuration des extensions TipTap. StarterKit (v3) embarque déjà
// Underline et Link : ne pas les réinstaller séparément sous peine d'erreur "duplicate
// extension name". TableKit embarque de même Table + TableRow + TableHeader + TableCell.
const extensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
  }),
  TaskList,
  TaskItem.configure({ nested: false }),
  TableKit.configure({ table: { resizable: false } }),
  Image,
  Placeholder.configure({ placeholder: 'Nouvelle note' }),
];

export default extensions;

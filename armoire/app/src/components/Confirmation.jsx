import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Confirmation({ ouvert, onOpenChange, titre, texte, action = 'Supprimer', onConfirmer }) {
  return (
    <AlertDialog open={ouvert} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-lg border border-vert bg-carte shadow-[8px_8px_0_var(--vert)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-[22px] text-vert-texte lowercase">{titre}</AlertDialogTitle>
          {texte && <AlertDialogDescription>{texte}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent">Annuler</AlertDialogCancel>
          <AlertDialogAction className="rounded-md bg-destructive text-white hover:bg-destructive/90" onClick={onConfirmer}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

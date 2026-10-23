import { cva } from 'class-variance-authority';

// Pastilles pleines, sans contour : claires au repos, Pine une fois sélectionnées.
export const tagVariants = cva(
  'inline-flex h-auto min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-normal leading-tight transition-colors duration-200 ease-out-quart outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40',
  {
    variants: {
      taille: {
        sm: 'px-2.5 py-1 text-[13px] md:text-[14px]',
        md: 'px-4 py-2 text-[15px] md:text-[16px]',
      },
      actif: {
        true: 'bg-pin text-primary-foreground hover:bg-pin/90 hover:text-primary-foreground data-[state=on]:bg-pin data-[state=on]:text-primary-foreground',
        false: 'bg-card text-foreground hover:bg-card/60 hover:text-foreground',
        fixe: 'bg-card text-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-pin data-[state=on]:text-primary-foreground',
      },
    },
    defaultVariants: { taille: 'sm', actif: false },
  },
);

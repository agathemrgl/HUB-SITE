import { cva } from 'class-variance-authority';

// Pastilles du carnet : contour noir ; au survol (et sélectionnées) elles se remplissent de noir.
// Une pastille sélectionnée survolée s'inverse pour indiquer qu'un clic la retire (sauf `fixe`).
export const tagVariants = cva(
  'inline-flex h-auto min-w-0 items-center justify-center whitespace-nowrap border border-black font-normal leading-tight transition-colors duration-300 ease-out-quart outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-vert-clair',
  {
    variants: {
      taille: {
        sm: 'px-2.5 py-0.5 text-[14px] md:text-[15px]',
        md: 'px-3 py-1 text-[16px] md:text-[18px]',
      },
      forme: {
        pastille: 'rounded-full',
        famille: 'rounded-none',
      },
      actif: {
        true: 'bg-black text-vert-clair hover:bg-vert-clair hover:text-black data-[state=on]:bg-black data-[state=on]:text-vert-clair data-[state=on]:hover:bg-vert-clair data-[state=on]:hover:text-black',
        false: 'bg-transparent text-black hover:bg-black hover:text-vert-clair',
        fixe: 'bg-transparent text-black hover:bg-black hover:text-vert-clair data-[state=on]:bg-black data-[state=on]:text-vert-clair data-[state=on]:hover:bg-black data-[state=on]:hover:text-vert-clair',
      },
    },
    defaultVariants: { taille: 'sm', forme: 'pastille', actif: false },
  },
);

import { useIsMobile } from '../hooks/useIsMobile';

export default function IconButton({ icon: Icon, active, danger, accent, className = '', ...props }) {
  const isMobile = useIsMobile();
  return (
    <button
      type="button"
      className={
        'flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40 ' +
        (active ? 'text-accent-strong' : danger ? 'text-danger' : accent ? 'text-accent-strong' : 'text-text-primary/70') +
        ' ' +
        className
      }
      {...props}
    >
      <Icon size={isMobile ? 19 : 16} strokeWidth={1.8} />
    </button>
  );
}

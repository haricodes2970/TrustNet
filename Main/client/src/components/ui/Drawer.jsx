import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Drawer = ({ open, onClose, title, children }) => {
  useEffect(() => { const close = (event) => event.key === 'Escape' && onClose?.(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
    <button className="absolute inset-0 w-full bg-trust-ink/45" aria-label="Close drawer" onClick={onClose} />
    <section className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-trust-paper p-6 shadow-soft-lg">
      <header className="mb-6 flex items-center justify-between border-b border-trust-ink/15 pb-4"><h2 className="font-display text-xl">{title}</h2><button className="focus-ring p-2" onClick={onClose} aria-label="Close"><X /></button></header>{children}
    </section>
  </div>;
};

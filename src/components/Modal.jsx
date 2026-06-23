import { X } from "lucide-react";
import Button from "./Button";

export default function Modal({ open, title, children, onClose, footer }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-valencia-navy/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-lift sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-valencia-line px-5 py-4">
          <h2 className="text-lg font-bold text-valencia-navy">{title}</h2>
          <Button aria-label="Close modal" variant="ghost" className="h-9 w-9 p-0" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer ? <div className="border-t border-valencia-line px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

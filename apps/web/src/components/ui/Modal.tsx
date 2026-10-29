"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Primitives";

export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = original;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section className="dialog-content">
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X size={21} />
          </IconButton>
        </header>
        {children}
      </section>
    </dialog>
  );
}

"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Primitives";

let openDialogs = 0;
let bodyOverflowBeforeDialogs = "";

export function Modal({
  title,
  children,
  onClose,
  className = "",
  subtitle,
  headerExtra,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    if (openDialogs++ === 0) bodyOverflowBeforeDialogs = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      if (--openDialogs === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
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
          {subtitle || headerExtra ? <div className="dialog-heading"><h2 id={titleId}>{title}</h2>{subtitle && <div className="dialog-subtitle">{subtitle}</div>}{headerExtra}</div> : <h2 id={titleId}>{title}</h2>}
          <IconButton label="Đóng" tooltip={false} onClick={onClose}>
            <X size={21} />
          </IconButton>
        </header>
        {children}
      </section>
    </dialog>
  );
}

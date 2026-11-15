"use client";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Fixed actions live beside the dock, outside animated route stacking contexts. */
export function FloatingActions({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setHost(document.getElementById("app-floating-actions")); }, []);
  return host ? createPortal(children, host) : null;
}

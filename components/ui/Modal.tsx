"use client";

import { useEffect, useRef, useCallback } from "react";
import { RAD, SHADOW, FONT, TXT, CLR, GRAY, T } from "../../styles/tokens";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number | string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, width = 640, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: T.bgPrimary,
          borderRadius: RAD.xl,
          boxShadow: SHADOW.xl,
          width: "100%",
          maxWidth: typeof width === "number" ? width : width,
          maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          animation: "scaleUp 0.2s ease",
          overflow: "hidden",
        }}
      >
        {title && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${T.borderDefault}`,
            flexShrink: 0,
          }}>
            <h2 style={{
              margin: 0, fontSize: TXT.lg, fontWeight: 700,
              color: T.textPrimary, fontFamily: FONT.sans,
            }}>
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose} size={28} variant="ghost">
              ✕
            </IconButton>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: title ? "20px" : 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

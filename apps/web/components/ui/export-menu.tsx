"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  downloadPdfPackage,
  downloadJsonPackage,
  downloadMarkdownPackage,
  downloadTextPackage,
  downloadZipPackage,
  formatReelPackageText,
  type ReelExportPackage,
} from "@/lib/export-package";
import type { ToastTone } from "@/components/ui/toast-viewport";

type ExportMenuProps = {
  pack: ReelExportPackage;
  onNotify: (title: string, tone: ToastTone, description?: string) => void;
  onExport?: (format: "copy" | "txt" | "markdown" | "json" | "pdf" | "zip") => void;
};

export function ExportMenu({ pack, onNotify, onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isZipGenerating, setIsZipGenerating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const copyAll = async () => {
    try {
      await window.navigator.clipboard.writeText(formatReelPackageText(pack));
      onExport?.("copy");
      onNotify("Complete package copied", "success", "All storyboard and reel outputs are ready to paste.");
      setIsOpen(false);
    } catch {
      onNotify("Unable to copy package", "error", "Clipboard access was unavailable. Please try again.");
    }
  };

  const downloadTxt = () => {
    downloadTextPackage(pack);
    onExport?.("txt");
    onNotify("TXT package downloaded", "success", "Your complete reel package is ready.");
    setIsOpen(false);
  };

  const downloadMarkdown = () => {
    downloadMarkdownPackage(pack);
    onExport?.("markdown");
    onNotify("Markdown package downloaded", "success", "Formatted creator package is ready.");
    setIsOpen(false);
  };

  const downloadJson = () => {
    downloadJsonPackage(pack);
    onExport?.("json");
    onNotify("JSON package downloaded", "success", "Structured creator assets are ready.");
    setIsOpen(false);
  };

  const downloadPdf = async () => {
    setIsPdfGenerating(true);
    try {
      await downloadPdfPackage(pack);
      onExport?.("pdf");
      onNotify("PDF package downloaded", "success", "Formatted export created successfully.");
      setIsOpen(false);
    } catch {
      onNotify("PDF export failed", "error", "Unable to create a PDF on this device.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const downloadZip = async () => {
    setIsZipGenerating(true);
    try {
      await downloadZipPackage(pack);
      onExport?.("zip");
      onNotify("ZIP package downloaded", "success", "All creator assets were bundled together.");
      setIsOpen(false);
    } catch {
      onNotify("ZIP export failed", "error", "Unable to build the complete package on this device.");
    } finally {
      setIsZipGenerating(false);
    }
  };

  return (
    <div ref={menuRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isPdfGenerating || isZipGenerating}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="export-trigger inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full px-3.5 text-xs font-medium text-frost transition disabled:cursor-wait disabled:opacity-75 sm:w-auto"
      >
        {isPdfGenerating || isZipGenerating ? (
          <>
            <span className="export-spinner h-3.5 w-3.5 rounded-full border border-cyberBlue/30 border-t-cyberBlue" />
            {isPdfGenerating ? "Building PDF" : "Building ZIP"}
          </>
        ) : (
          <>
            Export package
            <span className={`text-mist transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
              v
            </span>
          </>
        )}
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="export-menu absolute right-0 top-[calc(100%+0.55rem)] z-30 w-[min(17.5rem,calc(100vw-2rem))] rounded-2xl p-2 sm:left-auto sm:w-[17.5rem]"
            role="menu"
            aria-label="Export complete reel package"
          >
            <p className="px-3 pb-2 pt-1 text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-cyberBlue">
              Complete reel package
            </p>
            <ExportAction title="Copy all outputs" description="Clipboard ready" onClick={copyAll} />
            <ExportAction title="Download TXT" description="Plain formatted file" onClick={downloadTxt} />
            <ExportAction title="Download Markdown" description="Creator-ready document" onClick={downloadMarkdown} />
            <ExportAction title="Download JSON" description="Structured asset package" onClick={downloadJson} />
            <ExportAction
              title={isZipGenerating ? "Bundling ZIP..." : "Download ZIP"}
              description="Complete creator package"
              onClick={downloadZip}
              disabled={isZipGenerating}
            />
            <ExportAction
              title={isPdfGenerating ? "Generating PDF..." : "Download PDF"}
              description="Cinematic formatted export"
              onClick={downloadPdf}
              disabled={isPdfGenerating}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type ExportActionProps = {
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
};

function ExportAction({ title, description, disabled = false, onClick }: ExportActionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="export-action flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:cursor-wait disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-frost">{title}</span>
        <span className="mt-0.5 block text-[0.7rem] text-mist">{description}</span>
      </span>
      <span className="text-cyberBlue" aria-hidden="true">
        +
      </span>
    </button>
  );
}

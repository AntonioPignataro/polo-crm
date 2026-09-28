"use client";

import { cn } from "@/lib/utils";

interface StatStripProps {
  children: React.ReactNode;
  /** Desktop grid columns (default: 3) */
  desktopCols?: 2 | 3 | 4;
  className?: string;
}

/**
 * Horizontal scrollable stat card strip on mobile, grid on desktop.
 * Children render once — layout switches via CSS only.
 */
export function StatStrip({
  children,
  desktopCols = 3,
  className,
}: StatStripProps) {
  const gridClass =
    desktopCols === 2
      ? "md:grid-cols-2"
      : desktopCols === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-4";

  return (
    <div
      className={cn(
        // Mobile: horizontal scroll strip
        "flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory",
        // Desktop: grid layout
        "md:grid md:gap-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0 md:snap-none",
        gridClass,
        // Child card sizing
        "[&>*]:min-w-[200px] [&>*]:snap-start [&>*]:flex-shrink-0",
        "md:[&>*]:min-w-0 md:[&>*]:flex-shrink",
        // Hide scrollbar on mobile
        "scrollbar-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

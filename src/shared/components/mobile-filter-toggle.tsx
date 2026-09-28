"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileFilterToggleProps {
  children: React.ReactNode;
  /** Number of active (non-default) filters — shows a badge */
  activeCount?: number;
}

/**
 * On mobile: collapsible "Filtros" section behind a toggle button.
 * On desktop: always-visible flex row (unchanged behavior).
 */
export function MobileFilterToggle({
  children,
  activeCount = 0,
}: MobileFilterToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: toggle button + collapsible content */}
      <div className="md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filtros
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </span>
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>
        {open && (
          <div className="mt-3 flex flex-col gap-3">{children}</div>
        )}
      </div>

      {/* Desktop: always visible */}
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {children}
      </div>
    </>
  );
}

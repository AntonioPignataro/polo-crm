"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Root: Dialog on desktop, Sheet on mobile
// ---------------------------------------------------------------------------

function ResponsiveDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Sheet {...props}>{children}</Sheet>;
  }
  return <Dialog {...props}>{children}</Dialog>;
}

// ---------------------------------------------------------------------------
// Content: centered modal on desktop, bottom sheet on mobile
// ---------------------------------------------------------------------------

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn(
          "max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-8",
          className,
        )}
        showCloseButton={false}
        {...(props as React.ComponentProps<typeof SheetContent>)}
      >
        {/* Drag handle indicator */}
        <div className="mx-auto mb-2 mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />
        {children}
      </SheetContent>
    );
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Header / Footer / Title / Description / Close / Trigger
// ---------------------------------------------------------------------------

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  if (isMobile) return <SheetHeader className={className} {...props} />;
  return <DialogHeader className={className} {...props} />;
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  if (isMobile) return <SheetFooter className={className} {...props} />;
  return <DialogFooter className={className} {...props} />;
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();
  if (isMobile) return <SheetTitle className={className} {...props} />;
  return <DialogTitle className={className} {...props} />;
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile();
  if (isMobile) return <SheetDescription className={className} {...props} />;
  return <DialogDescription className={className} {...props} />;
}

function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>,
) {
  const isMobile = useIsMobile();
  if (isMobile) return <SheetClose {...props} />;
  return <DialogClose {...props} />;
}

function ResponsiveDialogTrigger(
  props: React.ComponentProps<typeof DialogTrigger>,
) {
  const isMobile = useIsMobile();
  if (isMobile) return <SheetTrigger {...props} />;
  return <DialogTrigger {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
  ResponsiveDialogTrigger,
};

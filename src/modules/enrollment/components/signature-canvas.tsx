"use client";

import { useEffect, useRef, useCallback } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string) => void;
  initialSignature?: string;
}

export function SignatureCanvas({
  onSignatureChange,
  initialSignature,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio ?? 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // Restore signature if it was cleared by resize
    if (padRef.current && initialSignature) {
      padRef.current.fromDataURL(initialSignature);
    }
  }, [initialSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });

    padRef.current.addEventListener("endStroke", () => {
      if (padRef.current && !padRef.current.isEmpty()) {
        onSignatureChange(padRef.current.toDataURL("image/png"));
      }
    });

    resizeCanvas();

    if (initialSignature) {
      padRef.current.fromDataURL(initialSignature);
    }

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      padRef.current?.off();
    };
  }, [resizeCanvas, initialSignature, onSignatureChange]);

  function handleClear() {
    padRef.current?.clear();
    onSignatureChange("");
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-md border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: "160px", touchAction: "none" }}
        />
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">
          Assine aqui
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
        >
          <Eraser className="mr-1 size-3" />
          Limpar
        </Button>
      </div>
    </div>
  );
}

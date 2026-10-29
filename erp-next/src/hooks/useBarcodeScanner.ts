import { useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  threshold?: number; // millisecond limit between characters
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  threshold = 50,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  // Keep callback ref fresh
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if the user is typing inside input elements and it's slow human typing
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Ignore modifier keys
      if (e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }

      // Enter key indicates end of scan
      if (e.key === "Enter") {
        if (bufferRef.current.length > 0) {
          // If scanner speed was met, intercept and handle
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(bufferRef.current);
          bufferRef.current = "";
        }
        return;
      }

      // Capture single printable characters
      if (e.key.length === 1) {
        // If the gap is too long, we reset the buffer (human typing)
        // If we are typing in an input and it's slow, reset the buffer and don't intercept
        if (timeDiff > threshold) {
          bufferRef.current = "";
        }
        
        // If it's human typing inside an input element, do not buffer
        if (isInput && timeDiff > threshold) {
          return;
        }

        bufferRef.current += e.key;
      }
    };

    // Use capture phase to intercept before inputs do
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, threshold]);
}

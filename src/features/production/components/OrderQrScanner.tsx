"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseProductionOrderInput } from "@/lib/productionOrderLink";

type ScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderDetected: (orderId: string) => void;
};

function ActiveOrderQrScanner({ onOpenChange, onOrderDetected }: Omit<ScannerProps, "open">) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "scanning">("idle");
  const inputId = useId();
  const errorId = useId();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const controls = useRef<IScannerControls | null>(null);
  const playTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const detected = useRef(false);

  const stopCamera = useCallback(() => {
    generation.current += 1;
    if (playTimeout.current) clearTimeout(playTimeout.current);
    playTimeout.current = null;
    const activeControls = controls.current;
    controls.current = null;
    try {
      activeControls?.stop();
    } finally {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  function acceptInput(value: string, decodingControls?: IScannerControls) {
    if (!mounted.current || detected.current) return;
    let orderId: string;
    try {
      orderId = parseProductionOrderInput(value, window.location.origin);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This is not a valid production order QR code.");
      return;
    }
    detected.current = true;
    decodingControls?.stop();
    stopCamera();
    setCameraState("idle");
    setError("");
    onOrderDetected(orderId);
    onOpenChange(false);
  }

  async function startCamera() {
    if (cameraState !== "idle" || detected.current) return;
    stopCamera();
    const ticket = generation.current;
    const cancelled = () => !mounted.current || ticket !== generation.current || detected.current;
    setError("");
    setCameraState("starting");
    let acquiredStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera unavailable. Use HTTPS and a supported browser, or enter the order link below.");
      }
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (cancelled()) return;
      acquiredStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (cancelled() || !video.current) {
        acquiredStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = acquiredStream;
      const preview = video.current;
      preview.srcObject = acquiredStream;
      await Promise.race([
        preview.play(),
        new Promise<never>((_, reject) => {
          playTimeout.current = setTimeout(() => reject(new Error("Camera playback timed out.")), 10000);
        }),
      ]);
      if (cancelled()) {
        acquiredStream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (playTimeout.current) clearTimeout(playTimeout.current);
      playTimeout.current = null;
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 300,
        delayBetweenScanSuccess: 1000,
      });
      // Own stream playback/cleanup so a cancelled decoder cannot detach a newer
      // camera session from the same video element during late async startup.
      const activeControls = reader.scan(
        preview,
        (result, decodeError, decodingControls) => {
          if (cancelled()) {
            decodingControls.stop();
            acquiredStream?.getTracks().forEach((track) => track.stop());
            return;
          }
          if (result) acceptInput(result.getText(), decodingControls);
          else if (decodeError && !["NotFoundException", "ChecksumException", "FormatException"].includes(decodeError.getKind?.())) {
            decodingControls.stop();
            stopCamera();
            setCameraState("idle");
            setError("Camera decoding stopped. Try starting the camera again or enter the order link below.");
          }
        },
      );
      if (cancelled()) {
        activeControls.stop();
        acquiredStream.getTracks().forEach((track) => track.stop());
        return;
      }
      controls.current = activeControls;
      setCameraState("scanning");
    } catch (cause) {
      acquiredStream?.getTracks().forEach((track) => track.stop());
      if (cancelled()) return;
      stopCamera();
      setCameraState("idle");
      const name = cause instanceof Error ? cause.name : "";
      setError(name === "NotAllowedError" || name === "SecurityError"
        ? "Camera permission was denied. Allow camera access in your browser or enter the order link below."
        : name === "NotFoundError" || name === "NotReadableError"
          ? "No usable camera is available. Check that it is connected and not used by another app, or enter the order link below."
          : "Unable to start the camera. Use HTTPS and a supported browser, or enter the order link below.");
    }
  }

  return (
    <Dialog open onOpenChange={(next) => {
      if (!next) stopCamera();
      onOpenChange(next);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan an order</DialogTitle>
          <DialogDescription>Open an order with its QR code or UUID. Scanning does not change quantities or advance production.</DialogDescription>
        </DialogHeader>
        <video
          ref={video}
          muted
          autoPlay
          playsInline
          aria-label="Order QR camera preview"
          className={cameraState === "idle" ? "hidden" : "aspect-video w-full rounded-lg bg-black object-cover"}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void startCamera()} disabled={cameraState !== "idle"}>
            {cameraState === "starting" ? "Starting camera…" : "Start camera"}
          </Button>
          {cameraState !== "idle" && <Button type="button" variant="outline" onClick={() => {
            stopCamera();
            setCameraState("idle");
          }}>Stop camera</Button>}
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {cameraState === "scanning" ? "Point the camera at an order QR code." : "Camera access starts only when you choose Start camera."}
        </p>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          acceptInput(input);
        }}>
          <label htmlFor={inputId}>Order URL or UUID (manual / hardware scanner)</label>
          <Input
            id={inputId}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={2048}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={error ? errorId : undefined}
            placeholder="/production?orderId=…"
          />
          <Button type="submit" disabled={!input.trim()}>Open order</Button>
        </form>
        {error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

/** Each open mounts a fresh detection session; closing invalidates all pending camera work. */
export function OrderQrScanner({ open, onOpenChange, onOrderDetected }: ScannerProps) {
  return open ? <ActiveOrderQrScanner onOpenChange={onOpenChange} onOrderDetected={onOrderDetected} /> : null;
}

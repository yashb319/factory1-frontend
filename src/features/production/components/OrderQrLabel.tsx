"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { productionOrderPath, productionOrderUrl } from "@/lib/productionOrderLink";

type LabelProps = { orderId: string; orderNumber: string };
type Qr = { url: string; uuid: string; size: number; path: string; deploymentWarning: boolean };

const PRINT_CSS = `
  @page { size: auto; margin: 20mm; }
  html, body { margin: 0; background: white; color: black; font: 16px Arial, sans-serif; }
  main { max-width: 170mm; margin: 0 auto; text-align: center; overflow-wrap: anywhere; }
  svg { display: block; width: 90mm; max-width: 100%; height: auto; margin: 8mm auto; }
  a { color: black; text-decoration: none; }
  h3 { font-size: 22px; }
  @media print { main { break-inside: avoid; } }
`;

function LabelContent({ orderId, orderNumber }: LabelProps) {
  const [qr, setQr] = useState<Qr | null>(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState("");
  const label = useRef<HTMLDivElement>(null);
  const disposePrint = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("qrcode")
      .then(({ default: QRCode }) => {
        const url = productionOrderUrl(orderId, window.location.origin);
        const uuid = productionOrderPath(orderId).split("=")[1];
        const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
        const segments: string[] = [];
        for (let y = 0; y < modules.size; y += 1) {
          for (let x = 0; x < modules.size; x += 1) {
            if (modules.get(y, x)) segments.push(`M${x + 4} ${y + 4}h1v1h-1z`);
          }
        }
        const hostname = window.location.hostname;
        if (!cancelled) {
          setQr({
            url,
            uuid,
            size: modules.size + 8,
            path: segments.join(""),
            deploymentWarning:
              window.location.protocol !== "https:" ||
              hostname === "localhost" ||
              hostname.endsWith(".localhost") ||
              hostname === "[::1]" ||
              /^127\./.test(hostname),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to generate the QR code. Close this dialog and try again.");
      });
    return () => {
      cancelled = true;
      disposePrint.current?.();
    };
  }, [orderId]);

  function printLabel() {
    if (!qr || !label.current || printing) return;
    disposePrint.current?.();
    setPrinting(true);
    setError("");
    setPrintMessage("");
    const frame = document.createElement("iframe");
    frame.title = "Production order print preview";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0";
    let disposed = false;
    const dispose = () => {
      disposed = true;
      clearTimeout(preparationTimeout);
      frame.remove();
    };
    disposePrint.current = dispose;
    const fail = () => {
      if (disposed) return;
      dispose();
      setPrinting(false);
      setError("Printing could not start. Allow printing in your browser, then try again.");
    };
    const preparationTimeout = setTimeout(fail, 10000);
    frame.onload = () => {
      if (disposed) return;
      const doc = frame.contentDocument;
      const printWindow = frame.contentWindow;
      if (!doc || !printWindow || !label.current) return fail();
      doc.title = "Production order QR label";
      const style = doc.createElement("style");
      style.textContent = PRINT_CSS;
      doc.head.append(style);
      const main = doc.createElement("main");
      main.append(doc.importNode(label.current, true));
      doc.body.replaceChildren(main);
      let printStarted = false;
      printWindow.addEventListener("beforeprint", () => { printStarted = true; });
      printWindow.addEventListener("afterprint", () => {
        if (disposed) return;
        setPrinting(false);
        dispose();
      }, { once: true });
      // The isolated document contains only inline SVG and DOM text: no network images/fonts.
      void doc.fonts.ready.then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (disposed) return;
          clearTimeout(preparationTimeout);
          try {
            if (typeof printWindow.print !== "function") return fail();
            printWindow.focus();
            printWindow.print();
            setPrinting(false);
            setPrintMessage(printStarted
              ? "Choose your printer or Save as PDF. If no dialog appeared, allow printing and try again."
              : "The browser may have blocked printing. Allow printing and try again; choose Save as PDF in the print dialog.");
          } catch {
            fail();
          }
        }));
      }).catch(fail);
    };
    frame.src = "about:blank";
    document.body.append(frame);
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Order QR label</DialogTitle>
        <DialogDescription>Scanning opens this order only. Print on normal paper or choose Save as PDF.</DialogDescription>
      </DialogHeader>
      {qr ? (
        <>
          <div ref={label} className="rounded-lg bg-white p-5 text-center text-black">
            <h3 className="break-words text-xl font-semibold">Order {orderNumber}</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              role="img"
              aria-label={`QR link for order ${orderNumber}`}
              className="mx-auto my-4 h-auto w-64 max-w-full"
              shapeRendering="crispEdges"
            >
              <rect width={qr.size} height={qr.size} fill="#fff" />
              <path d={qr.path} fill="#000" />
            </svg>
            <p className="break-all font-mono text-sm">{qr.uuid}</p>
            <p className="mt-2 break-all text-sm"><a href={qr.url}>{qr.url}</a></p>
          </div>
          {qr.deploymentWarning && (
            <p role="status" className="text-sm text-amber-700">
              Deployment warning: printed links must use your stable deployed HTTPS origin.
              Localhost or non-HTTPS links may not work on other devices. Reopen this label on the deployed site before distributing it.
            </p>
          )}
        </>
      ) : !error && <p role="status">Generating QR code locally…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {printMessage && <p role="status" className="text-sm">{printMessage}</p>}
      <Button type="button" disabled={!qr || printing} onClick={printLabel}>
        {printing ? "Preparing print…" : "Print / Save PDF"}
      </Button>
    </DialogContent>
  );
}

export function OrderQrLabel({ orderId, orderNumber }: LabelProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline">QR label</Button></DialogTrigger>
      {open && <LabelContent key={orderId} orderId={orderId} orderNumber={orderNumber} />}
    </Dialog>
  );
}

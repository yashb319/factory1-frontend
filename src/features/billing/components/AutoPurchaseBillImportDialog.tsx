"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, FileUp, Plus, ScanLine, Sparkles, Trash2, X } from "lucide-react";
import { recognize } from "tesseract.js";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateInventoryItemMutation,
  useGetInventoryItemsQuery,
} from "@/features/inventory/api/inventoryApi";
import type { InventoryItem } from "@/features/inventory/types/inventory.types";
import {
  useCreateSupplierMutation,
  useGetActiveSuppliersQuery,
} from "@/features/suppliers/api/supplierApi";
import type { Supplier } from "@/features/suppliers/types/supplier.types";
import {
  useCreateBillMutation,
  useExtractPurchaseBillOcrMutation,
  useGetBillNumberSuggestionQuery,
  useGetPurchaseBillOcrTemplatesQuery,
  useRememberPurchaseBillOcrTemplateMutation,
} from "../api/billingApi";
import type {
  PurchaseBillOcrExtractResponse,
  PurchaseBillOcrTemplateRequest,
} from "../types/billing.types";

type ImportLine = {
  id: string;
  ocrItemName?: string;
  itemName: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  rate: number;
  gstRate: number;
  inventoryItemId: string;
};

type ParsedBill = {
  supplierName: string;
  gstNumber: string;
  billNumber: string;
  billDate: string;
  placeOfSupply: string;
  intraState: boolean;
  lines: ImportLine[];
};

type LearnedBillTemplate = {
  id?: string;
  supplierKey: string;
  supplierName: string;
  gstNumber: string;
  signature: string;
  useCount: number;
  reviewedCount: number;
  globalShared: boolean;
  lastReviewedAt: string;
  itemAliases: Array<{
    sourceName: string;
    itemName: string;
    hsnCode: string;
    unit: string;
    gstRate: number;
  }>;
};

const learnedTemplatesKey = "factory1.purchaseBillOcrTemplates.v1";
const today = new Date().toISOString().slice(0, 10);

const emptyLine = (): ImportLine => ({
  id: randomId(),
  itemName: "",
  hsnCode: "",
  unit: "PCS",
  quantity: 1,
  rate: 0,
  gstRate: 18,
  inventoryItemId: "",
});

const emptyBill = (): ParsedBill => ({
  supplierName: "",
  gstNumber: "",
  billNumber: "",
  billDate: today,
  placeOfSupply: "",
  intraState: true,
  lines: [emptyLine()],
});

export function AutoPurchaseBillImportDialog({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [bill, setBill] = useState<ParsedBill>(() => emptyBill());
  const [rawText, setRawText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrTextOpen, setOcrTextOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [learnedTemplates, setLearnedTemplates] = useState<LearnedBillTemplate[]>(
    () => loadLearnedTemplates()
  );

  const { data: suppliers = [] } = useGetActiveSuppliersQuery();
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 500,
    status: "ACTIVE",
  });
  const { data: suggestedNumber } = useGetBillNumberSuggestionQuery("PURCHASE");
  const { data: serverTemplates = [] } = useGetPurchaseBillOcrTemplatesQuery();
  const [createSupplier, supplierState] = useCreateSupplierMutation();
  const [createInventoryItem, inventoryState] = useCreateInventoryItemMutation();
  const [createBill, billState] = useCreateBillMutation();
  const [rememberTemplate] = useRememberPurchaseBillOcrTemplateMutation();
  const [extractBackendOcr] = useExtractPurchaseBillOcrMutation();

  const inventoryItems = useMemo(
    () => inventoryPage?.content ?? [],
    [inventoryPage]
  );
  const supplierMatch = useMemo(
    () => findSupplier(bill, suppliers),
    [bill, suppliers]
  );
  const busy =
    supplierState.isLoading || inventoryState.isLoading || billState.isLoading;
  const ocrBusy = ocrStatus !== "";
  const availableTemplates = useMemo(
    () => mergeTemplates(serverTemplates, learnedTemplates),
    [learnedTemplates, serverTemplates]
  );
  const extractionConfidence = useMemo(
    () => calculateExtractionConfidence(bill),
    [bill]
  );
  const matchingTemplate = useMemo(
    () => findMatchingTemplate(rawText, bill, availableTemplates),
    [availableTemplates, bill, rawText]
  );

  const resetImportState = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setBill(emptyBill());
    setRawText("");
    setPreviewUrl("");
    setFileName("");
    setOcrProgress(0);
    setOcrStatus("");
    setOcrConfidence(null);
    setOcrTextOpen(false);
    setCameraError("");
  };

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [cameraActive]);

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available in this browser.");
      toast.error("Camera is not available in this browser.");
      return;
    }

    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 2200 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError("Camera permission was blocked or no camera was found.");
      toast.error("Camera permission was blocked or no camera was found.");
    }
  };

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  const captureCameraPhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error("Camera is still starting. Try again in a second.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Could not capture photo from camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      toast.error("Could not capture photo from camera.");
      return;
    }

    stopCamera();
    const file = new File([blob], "purchase-bill-camera.jpg", {
      type: "image/jpeg",
    });
    await handleFile(file);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    resetImportState();
    setOpen(nextOpen);
  };

  const parseText = (text = rawText) => {
    const parsed = parsePurchaseBillText(text, availableTemplates);
    setBill((current) => ({
      ...current,
      ...parsed,
      billNumber: parsed.billNumber || current.billNumber || suggestedNumber?.billNumber || "",
      billDate: parsed.billDate || current.billDate,
      lines: parsed.lines,
    }));
    toast.success("Bill details extracted for review");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setFileName(file.name);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");

    if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
      const text = await file.text();
      setRawText(text);
      parseText(text);
      toast.success("Text bill loaded and parsed.");
    } else {
      await runBackendOcr(file);
    }
  };

  const runBackendOcr = async (file: File) => {
    setOcrProgress(5);
    setOcrStatus("Backend OCR");

    try {
      const response = await extractBackendOcr(file).unwrap();
      applyBackendOcr(response);
      toast.success("Backend OCR complete. Review detected supplier and items.");
    } catch {
      toast.info("Backend OCR unavailable. Falling back to browser OCR.");
      await runOcr(file);
    } finally {
      setOcrProgress(0);
      setOcrStatus("");
    }
  };

  const applyBackendOcr = (response: PurchaseBillOcrExtractResponse) => {
    const raw = response.rawText || "";
    const backendBill =
      response.lines?.length > 0
        ? backendOcrToBill(response)
        : parsePurchaseBillText(raw, availableTemplates);
    const template = findMatchingTemplate(raw, backendBill, availableTemplates);
    const parsed = template
      ? applyLearnedTemplate(backendBill, template)
      : backendBill;

    setRawText(raw);
    setOcrConfidence(Math.round(response.confidence || 0));
    setBill((current) => ({
      ...current,
      ...parsed,
      billNumber: parsed.billNumber || current.billNumber || suggestedNumber?.billNumber || "",
      billDate: parsed.billDate || current.billDate,
      lines: parsed.lines,
    }));
  };

  const runOcr = async (file: File) => {
    setOcrProgress(0);
    setOcrStatus("Preparing OCR");

    try {
      const imageForOcr = await preprocessBillImage(file);
      const result = await recognize(imageForOcr, "eng", {
        logger: (message) => {
          if (message.status) {
            setOcrStatus(humanizeOcrStatus(message.status));
          }
          if (typeof message.progress === "number") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });
      const text = result.data.text.trim();
      setOcrConfidence(Math.round(result.data.confidence || 0));

      if (!text) {
        toast.error("OCR could not read text from this photo. Try a clearer, well-lit image.");
        return;
      }

      setRawText(text);
      parseText(text);
      toast.success("OCR complete. Review detected supplier and items.");
    } catch {
      toast.error("OCR failed. Try another image or paste bill text manually.");
    } finally {
      setOcrProgress(0);
      setOcrStatus("");
    }
  };

  const updateBill = (patch: Partial<ParsedBill>) => {
    setBill((current) => ({ ...current, ...patch }));
  };

  const updateLine = (id: string, patch: Partial<ImportLine>) => {
    setBill((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.id === id ? { ...line, ...patch } : line
      ),
    }));
  };

  const submitImport = async () => {
    const validLines = bill.lines.filter(
      (line) => line.itemName.trim() && Number(line.quantity) > 0
    );

    if (!bill.supplierName.trim() && !supplierMatch) {
      toast.error("Supplier name is required");
      return;
    }

    if (!validLines.length) {
      toast.error("Add at least one item from the bill");
      return;
    }

    try {
      let supplierId = supplierMatch?.id ?? "";
      if (!supplierId) {
        const response = await createSupplier({
          name: bill.supplierName.trim(),
          gstNumber: cleanOptional(bill.gstNumber),
          state: cleanOptional(bill.placeOfSupply),
          status: "ACTIVE",
          notes: "Created from purchase bill auto import.",
        }).unwrap();
        supplierId = response.data.id;
      }

      const billItems = [];
      for (const line of validLines) {
        let inventoryItem =
          (line.inventoryItemId
            ? inventoryItems.find((item) => item.id === line.inventoryItemId)
            : undefined) ?? findInventoryItem(line, inventoryItems);

        if (!inventoryItem) {
          const response = await createInventoryItem({
            name: line.itemName.trim(),
            itemType: "RAW_MATERIAL",
            category: "Purchase import",
            unit: line.unit.trim() || "PCS",
            openingStock: 0,
            minimumStock: 0,
            purchasePrice: Number(line.rate || 0),
            hsnCode: cleanOptional(line.hsnCode),
            gstRate: Number(line.gstRate || 0),
            supplierId,
            supplierName: bill.supplierName.trim(),
            notes: "Created from purchase bill auto import.",
          }).unwrap();
          inventoryItem = response.data;
        }

        billItems.push({
          inventoryItemId: inventoryItem.id,
          itemName: line.itemName.trim(),
          hsnCode: cleanOptional(line.hsnCode),
          unit: line.unit.trim() || inventoryItem.unit || "PCS",
          quantity: Number(line.quantity || 1),
          rate: Number(line.rate || 0),
          discountAmount: 0,
          gstRate: Number(line.gstRate || 0),
        });
      }

      await createBill({
        type: "PURCHASE",
        status: "POSTED",
        paymentStatus: "UNPAID",
        supplierId,
        billNumber: bill.billNumber.trim() || suggestedNumber?.billNumber,
        billDate: bill.billDate || today,
        placeOfSupply: cleanOptional(bill.placeOfSupply),
        intraState: bill.intraState,
        notes: [
          "Created from purchase bill auto import.",
          fileName ? `Source file: ${fileName}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        items: billItems,
      }).unwrap();

      const reviewedTemplate = buildReviewedTemplate(rawText, bill);
      const nextTemplates = rememberReviewedBill(reviewedTemplate, learnedTemplates);
      setLearnedTemplates(nextTemplates);
      try {
        await rememberTemplate(toTemplateRequest(reviewedTemplate)).unwrap();
      } catch {
        toast.info("Imported bill saved. OCR learning will sync when backend is reachable.");
      }
      toast.success("Purchase bill imported with supplier and inventory masters");
      setOpen(false);
      setBill(emptyBill());
      setRawText("");
      setFileName("");
      setOcrConfidence(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
    } catch {
      toast.error("Could not import purchase bill");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={compact ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        className={className}
        onClick={() => setOpen(true)}
      >
        <ScanLine className="mr-2 h-4 w-4" />
        Auto Bill Upload
      </Button>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Auto Upload Purchase Bill</DialogTitle>
            <DialogDescription>
              Capture or upload a supplier bill, review detected supplier and items, then create missing masters and post the purchase bill.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <section className="min-w-0 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto justify-center gap-2 border-dashed bg-slate-50 px-3 py-4 text-sm font-medium hover:bg-white"
                  onClick={() => void startCamera()}
                  disabled={ocrBusy || cameraActive}
                >
                  <Camera className="h-4 w-4" />
                  Live Camera
                </Button>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-slate-50 px-3 py-4 text-sm font-medium hover:bg-white">
                  <FileUp className="h-4 w-4" />
                  Upload File
                  <input
                    type="file"
                    accept="image/*,.txt,text/plain"
                    className="sr-only"
                    onChange={(event) => void handleFile(event.target.files?.[0])}
                  />
                </label>
              </div>

              {cameraActive ? (
                <div className="space-y-2 rounded-md border bg-slate-950 p-2">
                  <video
                    ref={videoRef}
                    className="max-h-72 w-full rounded bg-black object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className="gap-2"
                      onClick={() => void captureCameraPhoto()}
                      disabled={ocrBusy}
                    >
                      <Camera className="h-4 w-4" />
                      Capture Bill
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 bg-white"
                      onClick={stopCamera}
                    >
                      <X className="h-4 w-4" />
                      Close Camera
                    </Button>
                  </div>
                </div>
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Blob URLs from live camera/file inputs cannot be optimized by next/image.
                <img
                  src={previewUrl}
                  alt="Purchase bill preview"
                  className="max-h-72 w-full rounded-md border object-contain"
                />
              ) : (
                <div className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">
                  {cameraError || fileName || "No photo selected yet."}
                </div>
              )}

              {ocrBusy ? (
                <div className="relative overflow-hidden rounded-md border bg-slate-50 p-3 text-xs">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-50 via-white to-slate-100 opacity-80" />
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                      <span className="absolute h-10 w-10 animate-ping rounded-full bg-slate-400 opacity-25" />
                      <Sparkles className="relative h-4 w-4 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">AI is reading the bill</div>
                      <div className="truncate text-muted-foreground">
                        Detecting supplier, GSTIN, invoice number, and item rows
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-3 flex items-center justify-between gap-3">
                    <span className="font-medium">{ocrStatus}</span>
                    <span>{ocrProgress}%</span>
                  </div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-slate-950 transition-all"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
                  onClick={() => setOcrTextOpen((current) => !current)}
                >
                  <span>OCR / bill text</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {rawText ? `${rawText.length.toLocaleString()} chars` : "Closed"}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${ocrTextOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {ocrTextOpen ? (
                  <Textarea
                    value={rawText}
                    onChange={(event) => setRawText(event.target.value)}
                    className="min-h-48"
                    placeholder="Paste OCR text from the computer-generated bill here. Lines like 'Supplier: ABC', 'Invoice No: 123', and item rows with quantity/rate are detected."
                  />
                ) : null}
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => parseText()}
                  disabled={ocrBusy}
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  Detect Supplier and Items
                </Button>
              </div>
            </section>

            <section className="min-w-0 space-y-4">
              <div className="grid gap-3 rounded-md border p-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Supplier</label>
                  <Input
                    value={bill.supplierName}
                    onChange={(event) => updateBill({ supplierName: event.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">GSTIN</label>
                  <Input
                    value={bill.gstNumber}
                    onChange={(event) =>
                      updateBill({ gstNumber: event.target.value.toUpperCase() })
                    }
                    placeholder="15 digit GSTIN"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Detection</label>
                  <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
                    {supplierMatch ? (
                      <Badge variant="secondary" className="rounded-md">
                        Existing supplier: {supplierMatch.name}
                      </Badge>
                    ) : (
                      <Badge className="rounded-md bg-amber-600">
                        New supplier detected
                      </Badge>
                    )}
                    {ocrConfidence !== null ? (
                      <Badge variant="outline" className="rounded-md">
                        OCR {ocrConfidence}%
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="rounded-md">
                      Parse {extractionConfidence}%
                    </Badge>
                    <Badge
                      variant={matchingTemplate ? "secondary" : "outline"}
                      className="rounded-md"
                    >
                      {matchingTemplate
                        ? `Known format (${matchingTemplate.useCount} use${matchingTemplate.useCount === 1 ? "" : "s"})`
                        : "New format: review once"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Bill number</label>
                  <Input
                    value={bill.billNumber}
                    onChange={(event) => updateBill({ billNumber: event.target.value })}
                    placeholder={suggestedNumber?.billNumber ?? "Auto"}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Bill date</label>
                  <Input
                    type="date"
                    value={bill.billDate}
                    onChange={(event) => updateBill({ billDate: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">GST treatment</label>
                  <select
                    value={bill.intraState ? "INTRA" : "INTER"}
                    onChange={(event) =>
                      updateBill({ intraState: event.target.value === "INTRA" })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="INTRA">Intra-state</option>
                    <option value="INTER">Inter-state</option>
                  </select>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2">
                  <div>
                    <h3 className="text-sm font-semibold">Detected Items</h3>
                    <p className="text-xs text-muted-foreground">
                      {bill.lines.length} item(s) detected. New inventory items are created automatically when needed.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBill((current) => ({
                        ...current,
                        lines: [...current.lines, emptyLine()],
                      }))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3 p-3">
                  {bill.lines.length ? (
                    <>
                      <div className="hidden rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[minmax(220px,1fr)_90px_90px_80px_90px_80px_40px] md:gap-2">
                        <div>Item</div>
                        <div>HSN</div>
                        <div className="text-right">Qty</div>
                        <div>Unit</div>
                        <div className="text-right">Rate</div>
                        <div className="text-right">GST</div>
                        <div />
                      </div>
                      {bill.lines.map((line, index) => (
                        <div
                          key={line.id}
                          className="grid min-w-0 gap-2 rounded-md border bg-white p-3 md:grid-cols-[minmax(220px,1fr)_90px_90px_80px_90px_80px_40px] md:items-end"
                        >
                          <div className="min-w-0 space-y-1 md:space-y-0">
                            <label className="text-xs font-semibold">Item {index + 1}</label>
                            <Input
                              value={line.itemName}
                              onChange={(event) =>
                                updateLine(line.id, { itemName: event.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1 md:space-y-0">
                            <label className="text-xs font-semibold md:sr-only">HSN</label>
                            <Input
                              value={line.hsnCode}
                              onChange={(event) =>
                                updateLine(line.id, { hsnCode: event.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1 md:space-y-0">
                            <label className="text-xs font-semibold md:sr-only">Qty</label>
                            <NumberCell
                              value={line.quantity}
                              onChange={(value) => updateLine(line.id, { quantity: value })}
                            />
                          </div>
                          <div className="space-y-1 md:space-y-0">
                            <label className="text-xs font-semibold md:sr-only">Unit</label>
                            <Input
                              value={line.unit}
                              onChange={(event) =>
                                updateLine(line.id, { unit: event.target.value.toUpperCase() })
                              }
                            />
                          </div>
                          <div className="space-y-1 md:space-y-0">
                            <label className="text-xs font-semibold md:sr-only">Rate</label>
                            <NumberCell
                              value={line.rate}
                              onChange={(value) => updateLine(line.id, { rate: value })}
                            />
                          </div>
                          <div className="space-y-1 md:space-y-0">
                            <label className="text-xs font-semibold md:sr-only">GST</label>
                            <NumberCell
                              value={line.gstRate}
                              onChange={(value) => updateLine(line.id, { gstRate: value })}
                            />
                          </div>
                          <div className="flex items-end justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Remove detected item"
                              onClick={() =>
                                setBill((current) => ({
                                  ...current,
                                  lines: current.lines.filter((entry) => entry.id !== line.id),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="rounded-md border border-dashed bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                      No items detected yet. Upload a bill or add an item manually.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || ocrBusy} onClick={submitImport}>
              {busy ? "Importing..." : "Create Masters and Purchase Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NumberCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value || 0))}
      className="text-right"
    />
  );
}

function parsePurchaseBillText(
  text: string,
  learnedTemplates: LearnedBillTemplate[] = []
): ParsedBill {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const gstNumber = extractSupplierGstin(lines);
  const supplierName =
    extractSupplierName(lines) ||
    readLabeledValue(joined, ["supplier", "vendor", "seller", "party"]) ||
    firstLikelyName(lines);
  const billNumber = extractBillNumber(joined);
  const rawDate =
    extractBillDate(joined) ||
    readLabeledValue(joined, ["invoice date", "bill date", "date"]) ||
    joined.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0] ||
    "";
  const billDate = normalizeDate(rawDate) || today;
  const placeOfSupply =
    readLabeledValue(joined, ["place of supply", "state", "destination"]) || "";
  const defaultGstRate = extractInvoiceGstRate(joined);
  const taxSummaryHsns = extractTaxSummaryHsns(lines);
  const splitTableLines =
    parseSplitInvoiceTable(lines, defaultGstRate) ||
    parseSingleItemColumnTable(lines, defaultGstRate);
  const parsedLines = splitTableLines.length
    ? splitTableLines
    : lines
    .map((line) => parseItemLine(line, defaultGstRate))
    .filter((line): line is ImportLine => Boolean(line));
  const lineItems = applySummaryHsns(dedupeLines(parsedLines), taxSummaryHsns);

  const parsed = {
    supplierName,
    gstNumber,
    billNumber,
    billDate,
    placeOfSupply,
    intraState: !/\bIGST\b|Integrated Tax/i.test(joined),
    lines: lineItems,
  };
  const template = findMatchingTemplate(text, parsed, learnedTemplates);

  return template ? applyLearnedTemplate(parsed, template) : parsed;
}

function backendOcrToBill(response: PurchaseBillOcrExtractResponse): ParsedBill {
  return {
    supplierName: response.supplierName || "",
    gstNumber: response.gstNumber || "",
    billNumber: response.billNumber || "",
    billDate: response.billDate || today,
    placeOfSupply: response.placeOfSupply || "",
    intraState: response.intraState !== false,
    lines: (response.lines || []).map((line) => ({
      id: randomId(),
      ocrItemName: line.itemName || "",
      itemName: line.itemName || "",
      hsnCode: line.hsnCode || "",
      unit: line.unit || "PCS",
      quantity: Number(line.quantity || 0),
      rate: Number(line.rate || 0),
      gstRate: Number(line.gstRate || 0),
      inventoryItemId: "",
    })),
  };
}

function parseItemLine(line: string, defaultGstRate: number): ImportLine | null {
  if (/subtotal|total|tax|cgst|sgst|igst|round|invoice|supplier|vendor|gstin/i.test(line)) {
    return null;
  }

  const tableLine = parseInvoiceTableLine(line, defaultGstRate);
  if (tableLine) {
    return tableLine;
  }

  const parts = line
    .split(/\t|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 4) {
    const numbers = parts.map((part) => Number(part.replace(/[^\d.]/g, "")));
    const qtyIndex = numbers.findIndex((value) => Number.isFinite(value) && value > 0);
    const rateIndex = numbers.findIndex(
      (value, index) => index > qtyIndex && Number.isFinite(value) && value >= 0
    );

    if (qtyIndex > 0 && rateIndex > qtyIndex) {
      return {
        id: randomId(),
        ocrItemName: parts.slice(0, qtyIndex).join(" "),
        itemName: parts.slice(0, qtyIndex).join(" "),
        hsnCode: parts.find((part) => /^\d{4,8}$/.test(part)) || "",
        unit: parts.find((part) => /^[A-Z]{2,5}$/i.test(part))?.toUpperCase() || "PCS",
        quantity: numbers[qtyIndex],
        rate: numbers[rateIndex],
        gstRate: readGstRate(line, defaultGstRate),
        inventoryItemId: "",
      };
    }
  }

  const match = line.match(
    /^(.+?)\s+(\d{4,8})?\s+(\d+(?:\.\d+)?)\s*(PCS|NOS|KG|GMS|LTR|ML|MTR|BOX|BAG|ROLL)?\s+(\d+(?:\.\d+)?)/i
  );

  if (!match) {
    return null;
  }

  return {
    id: randomId(),
    ocrItemName: match[1].trim(),
    itemName: match[1].trim(),
    hsnCode: match[2] || "",
    quantity: Number(match[3] || 1),
    unit: (match[4] || "PCS").toUpperCase(),
    rate: Number(match[5] || 0),
    gstRate: readGstRate(line, defaultGstRate),
    inventoryItemId: "",
  };
}

function parseSplitInvoiceTable(lines: string[], defaultGstRate: number) {
  const descriptionStart = lines.findIndex((line) => /description of goods/i.test(line));
  if (descriptionStart < 0) {
    return null;
  }

  const tableEnd = lines.findIndex(
    (line, index) =>
      index > descriptionStart &&
      /less|cgst|sgst|igst|round off|amount chargeable|total\s*$/i.test(line)
  );
  const tableLines = lines.slice(descriptionStart + 1, tableEnd > descriptionStart ? tableEnd : undefined);
  const itemDescriptions = tableLines
    .map((line) => line.match(/^\s*\d+\s+(.+?(?:fabric|goods|material|yarn|paper|film|granules|roll).*)$/i)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(cleanItemName);

  if (!itemDescriptions.length) {
    return null;
  }

  const hsnCodes = tableLines
    .map((line) => line.match(/\b\d{6,8}\b/g) || [])
    .flat()
    .filter(
      (hsn) =>
        isLikelyHsnCode(hsn) && !itemDescriptions.some((item) => item.includes(hsn))
    );
  const embeddedHsns = itemDescriptions.map(
    (item) => item.match(/\b\d{6,8}\b(?!.*\b\d{6,8}\b)/)?.[0] || ""
  );
  const quantities = tableLines
    .map((line) => line.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|pcs|nos|mtr|ltr|box|bag|roll)\b/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      quantity: Number(match[1]),
      unit: normalizeUnit(match[2]),
    }));

  const rateStart = lines.findIndex((line, index) => index > descriptionStart && /^rate$/i.test(line));
  const amountStart = lines.findIndex((line, index) => index > descriptionStart && /^amount$/i.test(line));
  const rateLines = lines.slice(
    rateStart > -1 ? rateStart + 1 : tableEnd,
    amountStart > rateStart ? amountStart : undefined
  );
  const rates = rateLines
    .map((line) => line.match(/^\d+(?:\.\d{1,2})?$/)?.[0])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .filter((value) => value > 0);

  return itemDescriptions.map((description, index) => ({
    id: randomId(),
    ocrItemName: description,
    itemName: description,
    hsnCode: hsnCodes[index] || embeddedHsns[index] || "",
    quantity: quantities[index]?.quantity || 0,
    unit: quantities[index]?.unit || "PCS",
    rate: rates[index] || 0,
    gstRate: defaultGstRate,
    inventoryItemId: "",
  }));
}

function parseSingleItemColumnTable(lines: string[], defaultGstRate: number) {
  const descriptionStart = lines.findIndex((line) => /description of goods/i.test(line));
  if (descriptionStart < 0) {
    return [];
  }

  const tableEnd = lines.findIndex(
    (line, index) =>
      index > descriptionStart &&
      /amount chargeable|tax amount|company's pan/i.test(line)
  );
  const tableLines = lines.slice(
    descriptionStart + 1,
    tableEnd > descriptionStart ? tableEnd : undefined
  );
  const description =
    tableLines.find((line) => isLikelyItemDescription(line)) ||
    tableLines.find(
      (line) =>
        /^[A-Za-z][A-Za-z0-9().&\-\s]{4,}$/.test(line) && !isTableHeader(line)
    );

  if (!description) {
    return [];
  }

  const descriptionIndex = tableLines.indexOf(description);
  const afterDescription = tableLines.slice(descriptionIndex + 1);
  const hsnCode = afterDescription.find((line) => /^\d{4,8}$/.test(line)) || "";
  const quantityMatch = afterDescription
    .map((line) =>
      line.match(/^([\d,]+(?:\.\d+)?)\s*(kg|kgs|pcs|nos|mtr|ltr|box|bag|roll)$/i)
    )
    .find((match): match is RegExpMatchArray => Boolean(match));
  const rateStart = tableLines.findIndex((line) => /^rate$/i.test(line));
  const amountStart = tableLines.findIndex((line) => /^amount$/i.test(line));
  const rateSource =
    rateStart >= 0
      ? tableLines.slice(rateStart + 1, amountStart > rateStart ? amountStart : undefined)
      : afterDescription;
  const rate =
    rateSource
      .map((line) => line.match(/^\d+(?:\.\d{1,2})?$/)?.[0])
      .filter((value): value is string => Boolean(value))
      .map(Number)
      .find((value) => value > 0 && value < 100000 && String(value) !== hsnCode) || 0;

  return [
    {
      id: randomId(),
      ocrItemName: cleanItemName(description),
      itemName: cleanItemName(description),
      hsnCode,
      quantity: quantityMatch ? readMoney(quantityMatch[1]) : 0,
      unit: quantityMatch ? normalizeUnit(quantityMatch[2]) : "PCS",
      rate,
      gstRate: defaultGstRate,
      inventoryItemId: "",
    },
  ];
}

function parseInvoiceTableLine(line: string, defaultGstRate: number) {
  const normalized = line.replace(/\s+/g, " ").trim();
  if (!/^\d+\s+/.test(normalized) || !/(kg|pcs|nos|mtr|ltr|box|bag|roll)/i.test(normalized)) {
    return null;
  }

  const quantityMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|pcs|nos|mtr|ltr|box|bag|roll)\b/i);
  const amountMatch = normalized.match(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})|\d+\.\d{2})\s*$/);
  if (!quantityMatch || !amountMatch) {
    return null;
  }

  const quantity = Number(quantityMatch[1]);
  const unit = normalizeUnit(quantityMatch[2]);
  const amount = readMoney(amountMatch[1]);
  const beforeQuantity = normalized.slice(0, quantityMatch.index).trim();
  const afterQuantity = normalized.slice((quantityMatch.index || 0) + quantityMatch[0].length, amountMatch.index).trim();
  const hsnCandidates = beforeQuantity.match(/\b\d{6,8}\b/g) || [];
  const hsnCode = hsnCandidates.at(-1) || "";
  const itemName = cleanItemName(
    beforeQuantity
      .replace(/^\d+\s+/, "")
      .replace(/\b\d{6,8}\b/g, "")
  );
  const numericRate = readMoney(afterQuantity.match(/\d+(?:[.,]\d+)?/)?.[0] || "");
  const derivedRate = quantity > 0 && amount > 0 ? amount / quantity : numericRate;
  const rate =
    numericRate > 0 && numericRate < 1000 && Math.abs(numericRate - derivedRate) / Math.max(derivedRate, 1) < 0.25
      ? numericRate
      : roundCurrency(derivedRate);

  if (!itemName || !quantity || !rate) {
    return null;
  }

  return {
    id: randomId(),
    ocrItemName: itemName,
    itemName,
    hsnCode,
    quantity,
    unit,
    rate,
    gstRate: readGstRate(line, defaultGstRate),
    inventoryItemId: "",
  };
}

function readLabeledValue(text: string, labels: string[]) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\.?\\s*[:#-]?\\s*([^\\n]+)`, "i");
    const value = text.match(pattern)?.[1]?.trim();
    if (value && !isLikelyEmptyLabelValue(value)) {
      return value.replace(/\s{2,}.*/, "").trim();
    }

    const labelLineIndex = lines.findIndex((line) =>
      new RegExp(`^${label}\\.?$`, "i").test(line)
    );
    const nextValue =
      labelLineIndex >= 0
        ? lines.slice(labelLineIndex + 1).find((line) => !isTableHeader(line))
        : "";
    if (nextValue) {
      return nextValue.trim();
    }
  }
  return "";
}

function extractSupplierName(lines: string[]) {
  const supplierBlock = extractSellerBlock(lines);
  const companyPattern =
    /([A-Z][A-Za-z&.\-\s]{2,}?(?:Synthetics|Textiles|Fabric|Fabrics|Industries|Enterprises|Traders|Polymers|Packaging|Packers|Pvt|Private|Limited|Ltd)[A-Za-z0-9\s().&-]*)/i;
  const gstinIndex = supplierBlock.findIndex((line) => /gstin|gst\s*no|uin/i.test(line));
  if (gstinIndex > 0) {
    for (let index = gstinIndex - 1; index >= Math.max(0, gstinIndex - 10); index -= 1) {
      const cleaned = cleanCompanyName(supplierBlock[index] || "");
      if (isLikelySupplierName(cleaned)) {
        return cleaned;
      }
    }
  }

  for (const line of supplierBlock) {
    const match = line.match(companyPattern)?.[1];
    if (!match) {
      continue;
    }

    const cleaned = cleanCompanyName(match);
    if (cleaned) {
      return cleaned;
    }
  }

  return "";
}

function extractSupplierGstin(lines: string[]) {
  const supplierBlock = extractSellerBlock(lines);
  return extractGstinFromLines(supplierBlock, true) || extractGstinFromLines(lines, true);
}

function extractGstinFromLines(lines: string[], requireValidState = false) {
  for (const line of lines) {
    const direct = line.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/i)?.[0];
    if (direct && (!requireValidState || hasValidGstinState(direct))) {
      return direct.toUpperCase();
    }

    if (/gstin|gst\s*no|uin/i.test(line)) {
      const afterLabel = line.split(/gstin\/uin|gstin|gst\s*no|uin/i).at(-1) || "";
      const compact = afterLabel.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const fuzzy = compact.match(/\d{2}[A-Z]{5}\d{4}[A-Z0-9]{1,4}/)?.[0];
      const normalized = fuzzy ? normalizeGstinOcr(fuzzy) : "";
      if (normalized && (!requireValidState || hasValidGstinState(normalized))) {
        return normalized;
      }
    }
  }

  return "";
}

function extractBillNumber(text: string) {
  const normalized = text.replace(/[§$]/g, "S");
  const invoiceNumber =
    normalized.match(/\b[A-Z]{1,4}\/\d{2}-\d{2}\/\d{3,6}\b/i)?.[0] ||
    readLabeledValue(normalized, [
      "invoice no",
      "invoice number",
      "bill no",
      "bill number",
      "voucher no",
    ]);

  return invoiceNumber.replace(/[^A-Z0-9/-]/gi, "").toUpperCase();
}

function extractBillDate(text: string) {
  const invoiceDate = text.match(/\b(?:dated|invoice date|bill date)\s*\n?\s*(\d{1,2}[-/][A-Za-z0-9]{2,}[-/]\d{2,4})/i)?.[1];
  if (invoiceDate) {
    return invoiceDate;
  }

  const dateAfterDated = text.match(/\bdated\b(?:[^\n]*\n){0,2}[^\n]*(\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{2,4})/i)?.[1];
  if (dateAfterDated) {
    return dateAfterDated;
  }

  const datedLine = text
    .split(/\r?\n/)
    .find((line) => /dated|invoice date|bill date/i.test(line) && /\d{1,2}[-/][A-Za-z0-9]{2,}[-/]\d{2,4}/.test(line));
  return datedLine?.match(/\d{1,2}[-/][A-Za-z0-9]{2,}[-/]\d{2,4}/)?.[0] || "";
}

function extractInvoiceGstRate(text: string) {
  const cgst = text.match(/CGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i)?.[1];
  const sgst = text.match(/SGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i)?.[1];
  const igst = text.match(/IGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i)?.[1];

  if (igst) {
    return Number(igst);
  }
  if (cgst || sgst) {
    return Number(cgst || 0) + Number(sgst || 0);
  }

  return 18;
}

function extractTaxSummaryHsns(lines: string[]) {
  const summaryStart = findSectionIndex(lines, /HSN\/SAC.*Taxable|Taxable.*CGST|TaxAmount/i);
  const summaryLines = lines.slice(summaryStart >= 0 ? summaryStart : 0);
  return summaryLines
    .map((line) => line.match(/\b\d{8}\b/)?.[0])
    .filter((value): value is string => Boolean(value));
}

function applySummaryHsns(lines: ImportLine[], hsns: string[]) {
  return lines.map((line, index) => {
    const summaryHsn = hsns[index];
    return {
      ...line,
      hsnCode: summaryHsn || line.hsnCode,
      itemName: summaryHsn
        ? line.itemName.replace(/\b\d{8}\b(?!.*\b\d{8}\b)/, summaryHsn)
        : line.itemName,
    };
  });
}

function applyLearnedTemplate(bill: ParsedBill, template: LearnedBillTemplate): ParsedBill {
  return {
    ...bill,
    supplierName: template.supplierName || bill.supplierName,
    gstNumber: template.gstNumber || bill.gstNumber,
    lines: bill.lines.map((line) => {
      const alias = findItemAlias(line, template);
      if (!alias) {
        return line;
      }

      return {
        ...line,
        itemName: alias.itemName || line.itemName,
        hsnCode: alias.hsnCode || line.hsnCode,
        unit: alias.unit || line.unit,
        gstRate: Number.isFinite(alias.gstRate) ? alias.gstRate : line.gstRate,
      };
    }),
  };
}

function findMatchingTemplate(
  rawText: string,
  bill: ParsedBill,
  templates: LearnedBillTemplate[]
) {
  const supplierKey = supplierTemplateKey(bill);
  const signature = buildFormatSignature(rawText);

  return templates
    .filter((template) => {
      if (supplierKey && template.supplierKey === supplierKey) {
        return true;
      }
      return signature && template.signature === signature;
    })
    .sort(
      (a, b) =>
        b.useCount - a.useCount ||
        (b.lastReviewedAt || "").localeCompare(a.lastReviewedAt || "")
    )[0];
}

function buildReviewedTemplate(rawText: string, bill: ParsedBill): LearnedBillTemplate {
  return {
    supplierKey: supplierTemplateKey(bill),
    supplierName: bill.supplierName.trim(),
    gstNumber: bill.gstNumber.trim().toUpperCase(),
    signature: buildFormatSignature(rawText),
    globalShared: true,
    useCount: 1,
    reviewedCount: 1,
    lastReviewedAt: new Date().toISOString(),
    itemAliases: mergeItemAliases([], bill.lines),
  };
}

function rememberReviewedBill(
  reviewedTemplate: LearnedBillTemplate,
  templates: LearnedBillTemplate[]
) {
  if (!reviewedTemplate.supplierKey || !reviewedTemplate.itemAliases.length) {
    return templates;
  }

  const existing = templates.find(
    (template) =>
      template.supplierKey === reviewedTemplate.supplierKey &&
      template.signature === reviewedTemplate.signature
  );
  const nextTemplate: LearnedBillTemplate = {
    id: existing?.id || randomId(),
    supplierKey: reviewedTemplate.supplierKey,
    supplierName: reviewedTemplate.supplierName,
    gstNumber: reviewedTemplate.gstNumber,
    signature: reviewedTemplate.signature,
    globalShared: true,
    useCount: (existing?.useCount || 0) + 1,
    reviewedCount: (existing?.reviewedCount || 0) + 1,
    lastReviewedAt: new Date().toISOString(),
    itemAliases: mergeTemplateAliases(
      existing?.itemAliases || [],
      reviewedTemplate.itemAliases
    ),
  };
  const nextTemplates = [
    nextTemplate,
    ...templates.filter((template) => template.id !== nextTemplate.id),
  ].slice(0, 40);

  saveLearnedTemplates(nextTemplates);
  return nextTemplates;
}

function toTemplateRequest(
  template: LearnedBillTemplate
): PurchaseBillOcrTemplateRequest {
  return {
    supplierKey: template.supplierKey,
    supplierName: template.supplierName,
    gstNumber: template.gstNumber,
    formatSignature: template.signature,
    globalShared: true,
    itemAliases: template.itemAliases,
  };
}

function mergeTemplates(
  serverTemplates: Array<{
    id?: string;
    supplierKey: string;
    supplierName: string;
    gstNumber: string;
    formatSignature: string;
    globalShared: boolean;
    useCount: number;
    reviewedCount: number;
    lastReviewedAt?: string;
    itemAliases: LearnedBillTemplate["itemAliases"];
  }>,
  localTemplates: LearnedBillTemplate[]
) {
  const byKey = new Map<string, LearnedBillTemplate>();

  for (const template of localTemplates) {
    byKey.set(`${template.supplierKey}|${template.signature}`, template);
  }

  for (const template of serverTemplates) {
    byKey.set(`${template.supplierKey}|${template.formatSignature}`, {
      id: template.id,
      supplierKey: template.supplierKey,
      supplierName: template.supplierName,
      gstNumber: template.gstNumber,
      signature: template.formatSignature,
      globalShared: template.globalShared,
      useCount: template.useCount,
      reviewedCount: template.reviewedCount,
      lastReviewedAt: template.lastReviewedAt || "",
      itemAliases: template.itemAliases || [],
    });
  }

  return Array.from(byKey.values());
}

function mergeTemplateAliases(
  existing: LearnedBillTemplate["itemAliases"],
  incoming: LearnedBillTemplate["itemAliases"]
) {
  const aliases = new Map<string, LearnedBillTemplate["itemAliases"][number]>();

  for (const alias of existing) {
    aliases.set(normalizeName(alias.sourceName), alias);
  }
  for (const alias of incoming) {
    aliases.set(normalizeName(alias.sourceName), alias);
  }

  return Array.from(aliases.values()).slice(0, 100);
}

function mergeItemAliases(
  existing: LearnedBillTemplate["itemAliases"],
  lines: ImportLine[]
) {
  const aliases = new Map<string, LearnedBillTemplate["itemAliases"][number]>();

  for (const alias of existing) {
    aliases.set(normalizeName(alias.sourceName), alias);
  }

  for (const line of lines) {
    const sourceName = line.ocrItemName || line.itemName;
    const key = normalizeName(sourceName);
    if (!key) {
      continue;
    }

    aliases.set(key, {
      sourceName,
      itemName: line.itemName.trim(),
      hsnCode: line.hsnCode.trim(),
      unit: line.unit.trim() || "PCS",
      gstRate: Number(line.gstRate || 0),
    });
  }

  return Array.from(aliases.values()).slice(0, 80);
}

function findItemAlias(line: ImportLine, template: LearnedBillTemplate) {
  const sourceName = normalizeName(line.ocrItemName || line.itemName);
  return template.itemAliases.find((alias) => {
    const aliasName = normalizeName(alias.sourceName);
    return aliasName === sourceName || namesAreSimilar(aliasName, sourceName);
  });
}

function readGstRate(line: string, fallback = 18) {
  const rate = line.match(/(?:gst|tax)?\s*(0|3|5|12|18|28)\s*%/i)?.[1];
  return rate ? Number(rate) : fallback;
}

function firstLikelyName(lines: string[]) {
  const cleanLines = lines.filter(
    (line) =>
      line.length > 4 &&
      /[a-z]/i.test(line) &&
      !/invoice|bill|date|gst|tax|total|amount|qty|rate|ack|irn|e-mail/i.test(line)
  );
  return cleanCompanyName(cleanLines[0] || "");
}

function extractSellerBlock(lines: string[]) {
  const end = findSectionIndex(lines, /consignee|buyer\s*\(bill|ship\s*to/i);
  const beforeBuyer = lines.slice(0, end);
  const buyerIndex = beforeBuyer.findIndex((line) => /^buyer\b/i.test(line));
  if (buyerIndex > 0) {
    return beforeBuyer.slice(0, buyerIndex);
  }

  const sellerNameIndex = beforeBuyer.findIndex((line) => isLikelySupplierName(cleanCompanyName(line)));
  if (sellerNameIndex >= 0) {
    return beforeBuyer.slice(sellerNameIndex);
  }

  const ackDateIndex = beforeBuyer.findIndex((line) => /ack date/i.test(line));
  if (ackDateIndex >= 0) {
    return beforeBuyer.slice(ackDateIndex + 1);
  }

  return beforeBuyer;
}

function isLikelySupplierName(value: string) {
  return (
    value.length > 3 &&
    /[a-z]/i.test(value) &&
    /synthetics|textiles|fabric|fabrics|industries|enterprises|traders|polymers|packaging|pvt|private|limited|ltd/i.test(value) &&
    !/buyer|consignee|ship to|tax invoice|original for recipient/i.test(value)
  );
}

function hasValidGstinState(value: string) {
  const stateCode = Number(value.slice(0, 2));
  return stateCode >= 1 && stateCode <= 38;
}

function normalizeDate(value: string) {
  const clean = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const monthNameMatch = clean.match(/(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})/);
  if (monthNameMatch) {
    const month = monthNumber(monthNameMatch[2]);
    if (month) {
      const day = monthNameMatch[1].padStart(2, "0");
      const year =
        monthNameMatch[3].length === 2 ? `20${monthNameMatch[3]}` : monthNameMatch[3];
      return `${year}-${month}-${day}`;
    }
  }

  const match = clean.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) {
    return "";
  }

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
}

function dedupeLines(lines: ImportLine[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = `${line.itemName.toLowerCase()}-${line.hsnCode}-${line.quantity}-${line.rate}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function findSupplier(bill: ParsedBill, suppliers: Supplier[]) {
  const gstNumber = bill.gstNumber.trim().toUpperCase();
  const supplierName = normalizeName(bill.supplierName);

  return suppliers.find((supplier) => {
    if (gstNumber && supplier.gstNumber?.toUpperCase() === gstNumber) {
      return true;
    }
    return supplierName && normalizeName(supplier.name) === supplierName;
  });
}

function findInventoryItem(line: ImportLine, inventoryItems: InventoryItem[]) {
  const itemName = normalizeName(line.itemName);
  const hsnCode = line.hsnCode.trim();

  return inventoryItems.find((item) => {
    if (line.inventoryItemId && item.id === line.inventoryItemId) {
      return true;
    }
    if (hsnCode && item.hsnCode === hsnCode && normalizeName(item.name) === itemName) {
      return true;
    }
    return itemName && normalizeName(item.name) === itemName;
  });
}

function normalizeName(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function cleanCompanyName(value: string) {
  return value
    .replace(/^[^A-Za-z]+/, "")
    .replace(/^[A-Z]{1,4}\s+(?=[A-Z][a-z])/g, "")
    .replace(/\b(invoice|voice|dated|delivery|note|mode|terms).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeGstinOcr(value: string) {
  const gstin = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  if (gstin.length < 15) {
    return "";
  }

  const chars = gstin.split("");
  if (chars[13] === "2") {
    chars[13] = "Z";
  }
  return chars.join("");
}

function isLikelyEmptyLabelValue(value: string) {
  return !value || /^[.:#-]+$/.test(value) || /^(no|date|note|ref|reference)$/i.test(value);
}

function isTableHeader(value: string) {
  return /^(si|sl|no\.?|description of goods|hsn\/sac|quantity|rate|per|disc\.? %|amount|igst|cgst|sgst|total)$/i.test(value.trim());
}

function isLikelyItemDescription(value: string) {
  return (
    /^[A-Za-z][A-Za-z0-9().&\-\s]{4,}$/.test(value) &&
    /bag|fabric|goods|material|yarn|paper|film|granules|roll|box|woven/i.test(value) &&
    !isTableHeader(value) &&
    !/buyer|supplier|transport|destination|terms|delivery|invoice|dated/i.test(value)
  );
}

function cleanItemName(value: string) {
  return value
    .replace(/[|_]+/g, " ")
    .replace(/\b(?:LUU|LUS|SUS|S00|SOO)\d{3,}\b/gi, "")
    .replace(/\bSEM\b/gi, "GSM")
    .replace(/\bSSM\b/gi, "GSM")
    .replace(/\bMen\s+Woven\b/i, "Non Woven")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isLikelyHsnCode(value: string) {
  return /^\d{6,8}$/.test(value) && !value.startsWith("0");
}

function findSectionIndex(lines: string[], pattern: RegExp) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index >= 0 ? index : lines.length;
}

function normalizeUnit(value: string) {
  const unit = value.toUpperCase();
  if (unit === "KGS") {
    return "KG";
  }
  return unit;
}

function readMoney(value: string) {
  return Number(value.replace(/[^\d.]/g, "")) || 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function monthNumber(value: string) {
  const month = value.slice(0, 3).toLowerCase();
  const index = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(month);
  return index >= 0 ? String(index + 1).padStart(2, "0") : "";
}

function calculateExtractionConfidence(bill: ParsedBill) {
  let score = 0;
  score += bill.supplierName.trim().length > 3 ? 20 : 0;
  score += bill.gstNumber.trim().length === 15 ? 15 : 0;
  score += bill.billNumber.trim() ? 15 : 0;
  score += bill.billDate.trim() ? 10 : 0;
  score += bill.lines.length > 0 ? 15 : 0;
  score += bill.lines.filter((line) => line.itemName && line.quantity > 0 && line.rate > 0).length
    ? 15
    : 0;
  score += bill.lines.every((line) => line.hsnCode && line.gstRate >= 0) ? 10 : 0;
  return Math.min(100, score);
}

function loadLearnedTemplates() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(learnedTemplatesKey) || "[]"
    );
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeStoredTemplate)
          .filter((template): template is LearnedBillTemplate => Boolean(template))
      : [];
  } catch {
    return [];
  }
}

function normalizeStoredTemplate(value: unknown): LearnedBillTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const template = value as Partial<LearnedBillTemplate> & {
    uses?: number;
    formatSignature?: string;
  };
  const supplierKey = String(template.supplierKey || "").trim();
  const signature = String(template.signature || template.formatSignature || "").trim();

  if (!supplierKey || !signature) {
    return null;
  }

  return {
    id: template.id,
    supplierKey,
    supplierName: String(template.supplierName || ""),
    gstNumber: String(template.gstNumber || ""),
    signature,
    globalShared: template.globalShared !== false,
    useCount: Number(template.useCount ?? template.uses ?? 1),
    reviewedCount: Number(template.reviewedCount ?? template.uses ?? 1),
    lastReviewedAt: String(template.lastReviewedAt || ""),
    itemAliases: Array.isArray(template.itemAliases)
      ? template.itemAliases
      : [],
  };
}

function saveLearnedTemplates(templates: LearnedBillTemplate[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(learnedTemplatesKey, JSON.stringify(templates));
}

function supplierTemplateKey(bill: Pick<ParsedBill, "gstNumber" | "supplierName">) {
  const gstNumber = bill.gstNumber.trim().toUpperCase();
  return gstNumber || normalizeName(bill.supplierName);
}

function buildFormatSignature(rawText: string) {
  const normalized = rawText
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) =>
      /tax invoice|description of goods|hsn\/?sac|quantity|cgst|sgst|bill of lading|motor vehicle|terms of delivery/i.test(line)
    )
    .slice(0, 12)
    .join("|");

  return normalized || "";
}

function namesAreSimilar(left: string, right: string) {
  if (!left || !right) {
    return false;
  }
  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftWords = new Set(left.split(" ").filter((word) => word.length > 2));
  const rightWords = right.split(" ").filter((word) => word.length > 2);
  const overlap = rightWords.filter((word) => leftWords.has(word)).length;

  return overlap >= Math.min(2, rightWords.length);
}

async function preprocessBillImage(file: File) {
  const image = await loadImage(file);
  const maxWidth = 1800;
  const scale = Math.min(2.2, Math.max(1, maxWidth / image.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = gray > 170 ? 255 : gray < 105 ? 0 : gray * 1.35 - 55;
    const value = Math.max(0, Math.min(255, contrasted));
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);

  return new Promise<Blob | File>((resolve) => {
    canvas.toBlob((blob) => resolve(blob || file), "image/png", 1);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load bill image"));
    };
    image.src = url;
  });
}

function cleanOptional(value?: string) {
  const clean = value?.trim();
  return clean || undefined;
}

function humanizeOcrStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

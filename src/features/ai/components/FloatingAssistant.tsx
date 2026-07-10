"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useExecuteAiActionMutation,
  useSendAiMessageMutation,
} from "../api/aiApi";
import type {
  AiActionProposal,
  AiChatMessage,
  AiChatResponse,
  AiMetric,
} from "../types/ai.types";
import { AiChartView } from "./AiChartView";

type ThreadMessage = AiChatMessage & {
  response?: AiChatResponse;
};

type ModuleConfig = {
  moduleName: string;
  description: string;
  defaultQuestion: string;
  starterQuestions: string[];
};

const STORAGE_KEY = "factory1-floating-assistant-open";

const moduleConfigs: Record<string, ModuleConfig> = {
  "/dashboard": {
    moduleName: "Dashboard",
    description: "Cross-module factory overview and risk checks.",
    defaultQuestion: "Summarize the factory dashboard and highlight the top risks today.",
    starterQuestions: [
      "Which factory risks need attention today?",
      "Show inventory and billing health as a chart.",
      "What should I check first today?",
    ],
  },
  "/employees": {
    moduleName: "Employees",
    description: "Employee records, departments, contacts and workforce questions.",
    defaultQuestion: "Summarize employee health, missing contact data and department risks.",
    starterQuestions: [
      "What is Rahul Kumar's mobile number?",
      "Which employees have missing phone or email data?",
      "Summarize active employees by department.",
    ],
  },
  "/attendance": {
    moduleName: "Attendance",
    description: "Attendance, absence, leave and workforce capacity.",
    defaultQuestion: "Summarize this month's attendance issues and any workforce risk.",
    starterQuestions: [
      "Summarize today's attendance.",
      "Who is absent today?",
      "Show this month's attendance issues.",
    ],
  },
  "/inventory": {
    moduleName: "Inventory",
    description: "Stock levels, low-stock risk, inventory value and suppliers.",
    defaultQuestion: "Summarize inventory risks and show a chart if inventory value breakdown helps.",
    starterQuestions: [
      "Which raw materials are low in stock?",
      "Show inventory value as a chart.",
      "Which items are out of stock?",
    ],
  },
  "/products": {
    moduleName: "Products",
    description: "Products, BOM readiness, production and finished goods planning.",
    defaultQuestion: "Summarize product and production readiness using current inventory.",
    starterQuestions: [
      "How is production looking this month?",
      "Can we produce this product with current inventory?",
      "Which products do not have BOM configured?",
    ],
  },
  "/payroll": {
    moduleName: "Payroll",
    description: "Salary runs, payroll totals, overtime and deductions.",
    defaultQuestion: "Summarize the latest payroll total, overtime and deduction risks.",
    starterQuestions: [
      "What is our latest payroll total?",
      "Show payroll trend as a chart.",
      "Which payroll runs are pending payment?",
    ],
  },
  "/billing": {
    moduleName: "Billing",
    description: "Sales bills, supplier bills, GST totals and stock impact.",
    defaultQuestion: "Summarize recent billing health, unpaid bills and GST amount risks.",
    starterQuestions: [
      "Find a bill by bill number or party name.",
      "Summarize sales and purchase bills this month.",
      "Which bills are unpaid?",
    ],
  },
  "/customers": {
    moduleName: "Customers",
    description: "Customer contacts, GST details, billing parties and follow-ups.",
    defaultQuestion: "Summarize customer risks, missing GST details and billing follow-ups.",
    starterQuestions: [
      "Show details for a customer by name.",
      "Which customers are missing GST numbers?",
      "Find recent sales bills by customer.",
    ],
  },
  "/suppliers": {
    moduleName: "Suppliers",
    description: "Supplier contacts, GST details, purchasing and supply risk.",
    defaultQuestion: "Summarize supplier risks, missing GST details and inventory dependency.",
    starterQuestions: [
      "Show details for a supplier by name.",
      "Which suppliers are missing GST numbers?",
      "Find recent purchase bills by supplier.",
    ],
  },
  "/import-export": {
    moduleName: "Import / Export",
    description: "Import and export job history.",
    defaultQuestion: "Summarize recent import and export activity.",
    starterQuestions: [
      "Which exports were completed recently?",
      "Which import or export jobs failed?",
      "Summarize data movement history.",
    ],
  },
  "/organization-settings": {
    moduleName: "Organization Settings",
    description: "Organization setup, employee access and role management.",
    defaultQuestion: "Explain what organization setup tasks I should complete next.",
    starterQuestions: [
      "How should I invite employees?",
      "How do roles affect access?",
      "What should I configure before going live?",
    ],
  },
};

const fallbackConfig: ModuleConfig = {
  moduleName: "Factory1",
  description: "Ask about your factory data and workflows.",
  defaultQuestion: "Summarize the most important things I should review now.",
  starterQuestions: [
    "Which factory risks need attention today?",
    "What should I check first?",
    "Show useful charts from my data.",
  ],
};

const toneClass: Record<AiMetric["tone"], string> = {
  neutral: "border-border bg-muted/40 text-foreground",
  good: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
};

export function FloatingAssistant() {
  const pathname = usePathname();
  const config = moduleConfigs[pathname] ?? fallbackConfig;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "true";
  });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [sendAiMessage, sendState] = useSendAiMessageMutation();
  const [executeAiAction, actionState] = useExecuteAiActionMutation();

  const history = useMemo(
    () =>
      messages
        .filter((message) => message.content)
        .slice(-6)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  const setPanelOpen = (next: boolean) => {
    setOpen(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  };

  const ask = async (question: string) => {
    const trimmed = question.trim();

    if (!trimmed) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const response = await sendAiMessage({
        message: `[${config.moduleName} module] ${trimmed}`,
        history,
      }).unwrap();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch {
      toast.error("AI could not answer right now");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not reach the AI service right now. Please try again in a moment.",
        },
      ]);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const applyAction = async (action: AiActionProposal) => {
    try {
      const result = await executeAiAction({
        actionId: action.id,
        module: action.module,
        recordId: action.recordId,
        field: action.field,
        newValue: action.newValue,
        payload: action.payload,
      }).unwrap();

      toast.success(result.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `${result.message}. I refreshed related module data.`,
        },
      ]);
    } catch {
      toast.error("Could not apply this AI update");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        data-tour="ai-assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition hover:scale-105 hover:bg-slate-800"
        aria-label="Open Factory1 assistant"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      data-tour="ai-assistant"
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-y-auto rounded-lg border bg-white shadow-2xl shadow-slate-950/15 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[420px]"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  Factory1 AI
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {config.moduleName}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Ask about {config.moduleName}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {config.description}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {config.starterQuestions.map((question) => (
              <Button
                key={question}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                disabled={sendState.isLoading}
                onClick={() => void ask(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length ? (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-[88%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[94%] space-y-3 rounded-md border bg-background px-3 py-2 text-sm"
                    }
                  >
                    <div className="flex items-center gap-2 text-xs font-medium opacity-80">
                      {message.role === "user" ? "You" : "Factory1 AI"}
                      {message.response?.fallback ? (
                        <Badge variant="outline" className="h-5 rounded-md">
                          Local summary
                        </Badge>
                      ) : null}
                    </div>

                    <p className="whitespace-pre-wrap leading-6">
                      {message.content}
                    </p>

                    {message.response?.metrics?.length ? (
                      <div className="grid gap-2">
                        {message.response.metrics.map((metric) => (
                          <div
                            key={`${index}-${metric.label}`}
                            className={`rounded-md border px-3 py-2 ${toneClass[metric.tone]}`}
                          >
                            <div className="text-xs opacity-80">{metric.label}</div>
                            <div className="mt-1 font-semibold">{metric.value}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <AiChartView chart={message.response?.chart} />

                    {message.response?.actions?.length ? (
                      <div className="space-y-2">
                        {message.response.actions.map((action) => (
                          <div
                            key={action.id}
                            className="rounded-md border bg-muted/20 p-3"
                          >
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              {action.module}
                            </div>
                            <div className="mt-1 font-medium">
                              {action.recordLabel}
                            </div>
                            <div className="mt-2 grid gap-2 text-xs">
                              <div className="rounded-md bg-background p-2">
                                Current {action.field}:{" "}
                                <span className="font-medium">
                                  {action.currentValue || "-"}
                                </span>
                              </div>
                              <div className="rounded-md bg-background p-2">
                                New {action.field}:{" "}
                                <span className="font-medium">
                                  {action.newValue}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="mt-3"
                              disabled={actionState.isLoading}
                              onClick={() => applyAction(action)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Apply update
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-md border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                  Ask about {config.moduleName.toLowerCase()} or choose a quick
                  question above.
                </div>
              )}

              {sendState.isLoading ? (
                <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Thinking through live Factory1 data...
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={`Ask about ${config.moduleName.toLowerCase()}...`}
                className="max-h-28 min-h-11 resize-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(input);
                  }
                }}
              />
              <Button
                type="submit"
                className="h-11 w-11 shrink-0 p-0"
                disabled={sendState.isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
      </div>
    </div>
  );
}

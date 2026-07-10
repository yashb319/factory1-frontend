"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, Send, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const starterQuestions = [
  "Which raw materials are low in stock?",
  "Show inventory value as a chart.",
  "Summarize this month's attendance issues.",
  "What factory risks need attention today?",
  "What is our latest payroll total?",
  "How is production looking this month?",
];

const toneClass: Record<AiMetric["tone"], string> = {
  neutral: "border-border bg-muted/40 text-foreground",
  good: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
};

export function AiAssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about inventory, attendance, payroll, customers, suppliers, products, or production. I will answer using your Factory1 data.",
    },
  ]);

  const [sendAiMessage, sendState] = useSendAiMessageMutation();
  const [executeAiAction, actionState] = useExecuteAiActionMutation();
  const formRef = useRef<HTMLFormElement>(null);

  const history = useMemo(
    () =>
      messages
        .filter((message) => message.content)
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();

    const message = input.trim();

    if (!message) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await sendAiMessage({
        message,
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

  const askStarter = (question: string) => {
    setInput(question);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
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
          content: `${result.message}. I refreshed the related module data.`,
        },
      ]);
    } catch {
      toast.error("Could not apply this AI update");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not apply that update. Please check your role access and the value format, then try again.",
        },
      ]);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[420px] flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask practical questions about your factory data.
          </p>
        </div>

        <Badge variant="outline" className="h-7 rounded-md px-3">
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Factory data aware
        </Badge>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="min-h-0 rounded-lg">
          <CardContent className="flex h-full min-h-0 flex-col gap-4 p-4">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {starterQuestions.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => askStarter(question)}
                >
                  {question}
                </Button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[82%] rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground"
                        : "max-w-[88%] space-y-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm"
                    }
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium opacity-80">
                      {message.role === "user" ? (
                        <UserRound className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                      {message.role === "user" ? "You" : "Factory1 AI"}
                      {message.response?.fallback && (
                        <Badge variant="outline" className="h-5 rounded-md">
                          Local summary
                        </Badge>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap leading-6">
                      {message.content}
                    </p>

                    {message.response?.metrics?.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {message.response.metrics.map((metric) => (
                          <div
                            key={`${index}-${metric.label}`}
                            className={`rounded-md border px-3 py-2 ${toneClass[metric.tone]}`}
                          >
                            <div className="text-xs opacity-80">
                              {metric.label}
                            </div>
                            <div className="mt-1 font-semibold">
                              {metric.value}
                            </div>
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
                            className="rounded-md border bg-background p-3"
                          >
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              {action.module}
                            </div>
                            <div className="mt-1 font-medium">
                              {action.recordLabel}
                            </div>
                            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                              <div className="rounded-md bg-muted/60 p-2">
                                <div className="text-muted-foreground">
                                  Current {action.field}
                                </div>
                                <div className="mt-1 font-medium">
                                  {action.currentValue || "-"}
                                </div>
                              </div>
                              <div className="rounded-md bg-muted/60 p-2">
                                <div className="text-muted-foreground">
                                  New {action.field}
                                </div>
                                <div className="mt-1 font-medium">
                                  {action.newValue}
                                </div>
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

                    {message.response?.suggestions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {message.response.suggestions.slice(0, 4).map((item) => (
                          <Button
                            key={item}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => askStarter(item)}
                          >
                            {item}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {sendState.isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Thinking through your factory data...
                  </div>
                </div>
              )}
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about stock, payroll, attendance, production..."
                className="max-h-32 min-h-12 resize-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
              />

              <Button
                type="submit"
                className="h-12 w-12 shrink-0 p-0"
                disabled={sendState.isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="hidden space-y-4 lg:block">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Common Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {starterQuestions.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                  onClick={() => askStarter(question)}
                >
                  {question}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Useful Areas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                "Inventory",
                "Attendance",
                "Payroll",
                "Production",
                "Customers",
                "Suppliers",
              ].map((area) => (
                <Badge key={area} variant="secondary" className="rounded-md">
                  {area}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

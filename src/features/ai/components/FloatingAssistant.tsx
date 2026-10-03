"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ExternalLink, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useExecuteAiActionMutation,
  useGetAiConversationQuery,
  useGetAiQuickQuestionsQuery,
  useSendAiMessageMutation,
} from "../api/aiApi";
import { useAiExport } from "../hooks/useAiExport";
import {
  AI_CONVERSATION_EVENT,
  isConversationResponseCurrent,
  moduleContextFromPathname,
  rankAdaptiveQuestions,
  readCurrentConversationId,
  setCurrentConversationId,
} from "../lib/assistantContext";
import type {
  AiActionProposal,
  AiMessageSnapshot,
} from "../types/ai.types";
import { AiMessageContent } from "./AiMessageContent";

const STORAGE_KEY = "factory1-floating-assistant-open";

type FloatingMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  snapshot?: AiMessageSnapshot | null;
  historical?: boolean;
};

export function FloatingAssistant() {
  const pathname = usePathname();
  const moduleContext = moduleContextFromPathname(pathname);
  const [open, setOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "true"
  );
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(
    readCurrentConversationId
  );
  const [localMessages, setLocalMessages] = useState<FloatingMessage[]>([]);
  const [sendAiMessage, sendState] = useSendAiMessageMutation();
  const [executeAiAction, actionState] = useExecuteAiActionMutation();
  const exportModule = useAiExport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const localIdRef = useRef(0);

  const conversationQuery = useGetAiConversationQuery(conversationId ?? "", {
    skip: !conversationId,
  });
  const quickQuestionsQuery = useGetAiQuickQuestionsQuery({
    moduleContext,
    currentRoute: pathname,
    limit: 6,
  });
  const quickQuestions = useMemo(
    () =>
      rankAdaptiveQuestions(
        quickQuestionsQuery.data ?? [],
        moduleContext
      ),
    [moduleContext, quickQuestionsQuery.data]
  );

  useEffect(() => {
    const handleConversationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId?: string }>).detail;
      setConversationId(detail.conversationId);
      setLocalMessages([]);
    };
    window.addEventListener(AI_CONVERSATION_EVENT, handleConversationChange);
    return () =>
      window.removeEventListener(AI_CONVERSATION_EVENT, handleConversationChange);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    node?.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [localMessages, sendState.isLoading]);

  const setPanelOpen = (next: boolean) => {
    setOpen(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  };

  const ask = async (question: string) => {
    const message = question.trim();
    if (!message || sendState.isLoading) return;
    const requestConversationId = conversationId;
    localIdRef.current += 1;
    const optimisticId = `floating-${localIdRef.current}`;
    setInput("");
    setLocalMessages((current) => [
      ...current,
      { id: optimisticId, role: "USER", content: message },
    ]);

    try {
      const response = await sendAiMessage({
        message,
        conversationId: requestConversationId,
        moduleContext,
        currentRoute: pathname,
      }).unwrap();
      if (!response.conversationId) throw new Error("Missing conversation id");
      if (
        !isConversationResponseCurrent(
          requestConversationId,
          readCurrentConversationId()
        )
      ) {
        return;
      }

      setConversationId(response.conversationId);
      setCurrentConversationId(response.conversationId);
      setLocalMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId),
        { id: response.userMessageId, role: "USER", content: message },
        {
          id: response.assistantMessageId,
          role: "ASSISTANT",
          content: response.answer,
          snapshot: {
            metrics: response.metrics,
            suggestions: response.suggestions,
            chart: response.chart,
            records: response.records,
            actions: response.actions,
            thinking: response.thinking,
            followUp: response.followUp,
            intent: response.intent,
            entity: response.entity,
            provider: response.provider,
            fallback: response.fallback,
            provenance: response.provenance,
          },
          historical: false,
        },
      ]);
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      toast.error(
        status === 409
          ? "Restore this archived conversation before replying"
          : "AI could not answer right now"
      );
      setLocalMessages((current) =>
        current.filter((item) => item.id !== optimisticId)
      );
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        data-tour="ai-assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 motion-reduce:transform-none dark:bg-white dark:text-slate-950"
        aria-label="Open Factory1 assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  const serverMessages = (conversationQuery.data?.messages ?? []).slice(-8);
  const serverMessageIds = new Set(serverMessages.map((message) => message.id));
  const messages: FloatingMessage[] = [
    ...serverMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      snapshot: message.snapshot,
      historical: true,
    })),
    ...localMessages.filter((message) => !serverMessageIds.has(message.id)),
  ];

  const applyAction = async (
    action: AiActionProposal,
    fieldsOverride?: Record<string, string>
  ) => {
    if (action.export) {
      const done = await exportModule(
        (action.payload?.exportModule as string) ?? action.module
      );
      toast[done ? "success" : "error"](
        done ? "Export started" : "Could not start this export"
      );
      return;
    }

    try {
      const result = await executeAiAction({
        actionId: action.id,
        module: action.module,
        recordId: action.recordId,
        field: action.field,
        newValue: action.newValue,
        payload: action.payload,
        create: action.create,
        delete: action.delete,
        restore: action.restore,
        approve: action.approve,
        export: action.export,
        fields:
          fieldsOverride ??
          (action.newValues as Record<string, string> | undefined),
      }).unwrap();
      toast.success(result.message);
    } catch {
      toast.error("Could not apply this update");
    }
  };

  return (
    <section
      data-tour="ai-assistant"
      aria-label="Factory1 AI assistant"
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(720px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-2xl shadow-slate-950/20 backdrop-blur sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[650px] sm:w-[430px]"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Factory1 AI</h2>
            <p className="truncate text-xs text-muted-foreground">
              {conversationQuery.data?.title ?? `${moduleContext} context`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Open full assistant">
            <Link href="/ai">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPanelOpen(false)}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="border-b px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">
          Suggested for this page
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {quickQuestions.map((question) => (
            <Button
              key={question.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto shrink-0 whitespace-normal py-2 text-left"
              disabled={sendState.isLoading}
              onClick={() => void ask(question.text)}
              title={question.reason ?? undefined}
            >
              {question.text}
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
        aria-live="polite"
        aria-busy={sendState.isLoading}
      >
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "USER"
                  ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[94%] space-y-2 rounded-2xl rounded-tl-md border bg-card px-3 py-2 text-sm shadow-sm"
              }
            >
              <p className="whitespace-pre-wrap leading-6">{message.content}</p>
              <AiMessageContent
                snapshot={message.snapshot}
                historical={message.historical}
                actionLoading={actionState.isLoading}
                onApplyAction={applyAction}
                onSuggestion={(suggestion) => void ask(suggestion)}
              />
            </div>
          ))
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center text-center">
            <div>
              <Sparkles className="mx-auto h-7 w-7 text-primary" />
              <p className="mt-3 text-sm font-medium">
                Ask about this part of your factory
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This panel resumes the same conversation as the full assistant.
              </p>
            </div>
          </div>
        )}
        {sendState.isLoading ? (
          <div className="rounded-2xl border bg-card px-3 py-2 text-sm text-muted-foreground" role="status">
            Checking relevant records...
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void ask(input);
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <Textarea
          value={input}
          maxLength={2000}
          onChange={(event) => setInput(event.target.value)}
          placeholder={`Ask about ${moduleContext.toLowerCase()}...`}
          className="max-h-28 min-h-11 resize-none"
          disabled={conversationQuery.data?.archived}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(input);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          disabled={
            sendState.isLoading ||
            !input.trim() ||
            conversationQuery.data?.archived
          }
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}

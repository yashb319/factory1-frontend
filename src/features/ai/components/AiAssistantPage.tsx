"use client";

import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Bot,
  Check,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  useArchiveAiConversationMutation,
  useCreateAiConversationMutation,
  useDeleteAiConversationMutation,
  useExecuteAiActionMutation,
  useGetAiConversationQuery,
  useGetAiConversationsQuery,
  useGetAiQuickQuestionsQuery,
  useRestoreAiConversationMutation,
  useSendAiMessageMutation,
  useUpdateAiConversationMutation,
} from "../api/aiApi";
import { useAiExport } from "../hooks/useAiExport";
import {
  moduleContextFromPathname,
  isConversationResponseCurrent,
  isHistoricalAssistantMessage,
  rankAdaptiveQuestions,
  readCurrentConversationId,
  setCurrentConversationId,
} from "../lib/assistantContext";
import type {
  AiActionProposal,
  AiChatMessage,
  AiChatResponse,
  AiConversationSummary,
} from "../types/ai.types";
import { AiMessageContent } from "./AiMessageContent";

type LocalMessage = Pick<AiChatMessage, "role" | "content"> & {
  id: string;
  snapshot?: AiChatMessage["snapshot"];
  historical?: boolean;
};

export const OWNER_BRIEFING_QUESTIONS = [
  "How is my factory doing today?",
  "What needs my attention today?",
  "What should I focus on today?",
] as const;

export function AiAssistantPage() {
  const pathname = usePathname();
  const moduleContext = moduleContextFromPathname(pathname);
  const [conversationId, setConversationId] = useState<string | undefined>(
    readCurrentConversationId
  );
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renameTarget, setRenameTarget] =
    useState<AiConversationSummary | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AiConversationSummary | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [liveAssistantMessageIds, setLiveAssistantMessageIds] = useState(
    () => new Set<string>()
  );
  const [sendAiMessage, sendState] = useSendAiMessageMutation();
  const [createConversation, createState] = useCreateAiConversationMutation();
  const [renameConversation, renameState] = useUpdateAiConversationMutation();
  const [archiveConversation] = useArchiveAiConversationMutation();
  const [restoreConversation] = useRestoreAiConversationMutation();
  const [deleteConversation, deleteState] =
    useDeleteAiConversationMutation();
  const [executeAiAction, actionState] = useExecuteAiActionMutation();
  const exportModule = useAiExport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const localIdRef = useRef(0);

  const conversationsQuery = useGetAiConversationsQuery({
    page: 0,
    size: 50,
    search: deferredSearch || undefined,
    archived: showArchived,
  });
  const conversationQuery = useGetAiConversationQuery(conversationId ?? "", {
    skip: !conversationId,
  });
  const quickQuestionsQuery = useGetAiQuickQuestionsQuery({
    moduleContext,
    currentRoute: pathname,
    limit: 6,
  });

  useEffect(() => {
    if (!sendState.isLoading) return;
    const node = scrollRef.current;
    node?.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [localMessages, sendState.isLoading]);

  const serverMessages = conversationQuery.data?.messages ?? [];
  const serverMessageIds = new Set(serverMessages.map((message) => message.id));
  const displayedMessages: LocalMessage[] = [
    ...serverMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      snapshot: message.snapshot,
      historical: isHistoricalAssistantMessage(
        message,
        liveAssistantMessageIds
      ),
    })),
    ...localMessages.filter((message) => !serverMessageIds.has(message.id)),
  ];
  const quickQuestions = useMemo(
    () =>
      rankAdaptiveQuestions(
        quickQuestionsQuery.data ?? [],
        moduleContext
      ),
    [moduleContext, quickQuestionsQuery.data]
  );

  const selectConversation = (id: string) => {
    setLocalMessages([]);
    setLiveAssistantMessageIds(new Set());
    setConversationId(id);
    setCurrentConversationId(id);
    setSidebarOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleNewChat = async () => {
    try {
      const created = await createConversation({
        moduleContext,
        currentRoute: pathname,
      }).unwrap();
      selectConversation(created.id);
    } catch {
      toast.error("Could not start a new conversation");
    }
  };

  const ask = async (question: string) => {
    const message = question.trim();
    if (!message || sendState.isLoading) return;

    const requestConversationId = conversationId;
    localIdRef.current += 1;
    const optimisticId = `local-${localIdRef.current}`;
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

      if (!response.conversationId) {
        throw new Error("Missing conversation identifier");
      }

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
      setLiveAssistantMessageIds((current) => {
        const next = new Set(current);
        next.add(response.assistantMessageId);
        return next;
      });
      setLocalMessages([
        { id: response.userMessageId, role: "USER", content: message },
        responseToLocalMessage(response),
      ]);
    } catch (error) {
      if (getStatus(error) === 409) {
        toast.error("This conversation is archived", {
          description: "Restore it before sending another message.",
        });
      } else {
        toast.error("AI could not answer right now");
      }
      setLocalMessages((current) => current.filter((item) => item.id !== optimisticId));
    }
  };

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
      toast.error("Could not apply this update", {
        description: "Check your access and the proposed values, then retry.",
      });
    }
  };

  const handleArchive = async (conversation: AiConversationSummary) => {
    try {
      if (conversation.archived) {
        await restoreConversation(conversation.id).unwrap();
        toast.success("Conversation restored");
      } else {
        await archiveConversation(conversation.id).unwrap();
        toast.success("Conversation archived");
        if (conversation.id === conversationId) {
          setConversationId(undefined);
          setCurrentConversationId(undefined);
          setLocalMessages([]);
          setLiveAssistantMessageIds(new Set());
        }
      }
    } catch {
      toast.error(`Could not ${conversation.archived ? "restore" : "archive"} conversation`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConversation(deleteTarget.id).unwrap();
      if (deleteTarget.id === conversationId) {
        setConversationId(undefined);
        setCurrentConversationId(undefined);
        setLocalMessages([]);
        setLiveAssistantMessageIds(new Set());
      }
      setDeleteTarget(null);
      toast.success("Conversation permanently deleted");
    } catch {
      toast.error("Could not delete conversation");
    }
  };

  const conversations = conversationsQuery.data?.content ?? [];
  const activeConversation = conversationQuery.data;
  const conversationErrorStatus = getStatus(conversationQuery.error);

  return (
    <div className="relative -m-4 h-[calc(100dvh-4rem)] min-h-[560px] overflow-hidden bg-background sm:-m-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="ai-ambient-orb absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="ai-ambient-orb ai-ambient-orb-delayed absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl" />
      </div>

      <div className="relative grid h-full md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r bg-card/90 backdrop-blur md:block">
          <ConversationSidebar
            conversations={conversations}
            selectedId={conversationId}
            loading={conversationsQuery.isLoading}
            error={conversationsQuery.isError}
            search={search}
            showArchived={showArchived}
            onSearch={setSearch}
            onShowArchived={setShowArchived}
            onSelect={selectConversation}
            onNew={() => void handleNewChat()}
            onRename={setRenameTarget}
            onArchive={(item) => void handleArchive(item)}
            onDelete={setDeleteTarget}
            creating={createState.isLoading}
          />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[320px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Conversation history</SheetTitle>
            </SheetHeader>
            <ConversationSidebar
              conversations={conversations}
              selectedId={conversationId}
              loading={conversationsQuery.isLoading}
              error={conversationsQuery.isError}
              search={search}
              showArchived={showArchived}
              onSearch={setSearch}
              onShowArchived={setShowArchived}
              onSelect={selectConversation}
              onNew={() => void handleNewChat()}
              onRename={setRenameTarget}
              onArchive={(item) => void handleArchive(item)}
              onDelete={setDeleteTarget}
              creating={createState.isLoading}
            />
          </SheetContent>
        </Sheet>

        <main className="flex min-h-0 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversation history"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {activeConversation?.title ?? "Factory intelligence"}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {activeConversation
                  ? `${activeConversation.currentModule} · ${activeConversation.messageCount} messages`
                  : "Decision-ready answers grounded in your Factory1 data"}
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Live data context
            </Badge>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            aria-live="polite"
            aria-busy={sendState.isLoading}
          >
            {conversationQuery.isLoading ? (
              <ConversationSkeleton />
            ) : conversationErrorStatus === 403 ? (
              <AssistantState
                title="AI Assistant is unavailable"
                description="Your account cannot access this assistant. Contact your organization owner if you need access."
              />
            ) : conversationErrorStatus === 404 ? (
              <AssistantState
                title="Conversation not found"
                description="It may have been removed, or it belongs to another user."
              />
            ) : displayedMessages.length ? (
              <div className="mx-auto max-w-3xl space-y-5">
                {displayedMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`ai-message-enter flex gap-3 ${
                      message.role === "USER" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "ASSISTANT" ? (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                        <Bot className="h-4 w-4" />
                      </div>
                    ) : null}
                    <div
                      className={
                        message.role === "USER"
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                          : "max-w-[92%] space-y-3 rounded-2xl rounded-tl-md border bg-card/90 px-4 py-3 text-sm shadow-sm"
                      }
                    >
                      <div className="flex items-center gap-2 text-xs font-medium opacity-70">
                        {message.role === "USER" ? (
                          <UserRound className="h-3.5 w-3.5" />
                        ) : null}
                        {message.role === "USER" ? "You" : "Factory1 AI"}
                      </div>
                      <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                      <AiMessageContent
                        snapshot={message.snapshot}
                        historical={message.historical}
                        actionLoading={actionState.isLoading}
                        onApplyAction={applyAction}
                        onSuggestion={(suggestion) => void ask(suggestion)}
                      />
                    </div>
                  </article>
                ))}
                {sendState.isLoading ? <ThinkingStatus /> : null}
              </div>
            ) : (
              <EmptyAssistant
                questions={quickQuestions}
                loading={quickQuestionsQuery.isLoading}
                error={quickQuestionsQuery.isError}
                onAsk={(question) => void ask(question)}
              />
            )}
          </div>

          <div className="shrink-0 border-t bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
            <form
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void ask(input);
              }}
            >
              <Textarea
                ref={inputRef}
                value={input}
                maxLength={2000}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about risks, operations, workforce, cash or production..."
                className="max-h-36 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(input);
                  }
                }}
                disabled={activeConversation?.archived}
                aria-label="Message Factory1 AI"
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                disabled={
                  sendState.isLoading ||
                  !input.trim() ||
                  activeConversation?.archived
                }
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mx-auto mt-1 max-w-3xl px-2 text-right text-[11px] text-muted-foreground">
              {input.length}/2000
            </p>
          </div>
        </main>
      </div>

      <RenameDialog
        key={renameTarget?.id ?? "rename-dialog"}
        conversation={renameTarget}
        loading={renameState.isLoading}
        onClose={() => setRenameTarget(null)}
        onRename={async (title) => {
          if (!renameTarget) return;
          try {
            await renameConversation({
              conversationId: renameTarget.id,
              title,
            }).unwrap();
            setRenameTarget(null);
            toast.success("Conversation renamed");
          } catch {
            toast.error("Could not rename conversation");
          }
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes “{deleteTarget?.title}” and its messages.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteState.isLoading}
              onClick={() => void handleDelete()}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  selectedId,
  loading,
  error,
  search,
  showArchived,
  creating,
  onSearch,
  onShowArchived,
  onSelect,
  onNew,
  onRename,
  onArchive,
  onDelete,
}: {
  conversations: AiConversationSummary[];
  selectedId?: string;
  loading: boolean;
  error: boolean;
  search: string;
  showArchived: boolean;
  creating: boolean;
  onSearch: (value: string) => void;
  onShowArchived: (value: boolean) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (item: AiConversationSummary) => void;
  onArchive: (item: AiConversationSummary) => void;
  onDelete: (item: AiConversationSummary) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <Button
        type="button"
        className="w-full justify-start rounded-xl"
        onClick={onNew}
        disabled={creating}
      >
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        New chat
      </Button>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search conversations"
          className="rounded-xl pl-9"
        />
      </div>
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {showArchived ? "Archived" : "Recent"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onShowArchived(!showArchived)}
        >
          {showArchived ? "View active" : "View archive"}
        </Button>
      </div>
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))
        ) : error ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Could not load conversations.
          </p>
        ) : conversations.length ? (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-start rounded-xl ${
                selectedId === conversation.id ? "bg-primary/10" : "hover:bg-muted"
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 px-3 py-2 text-left"
                onClick={() => onSelect(conversation.id)}
              >
                <span className="block truncate text-sm font-medium">
                  {conversation.title}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {conversation.preview ??
                    formatConversationTime(
                      conversation.lastMessageAt ?? conversation.updatedAt
                    )}
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-1 h-8 w-8 shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Actions for ${conversation.title}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!conversation.archived ? (
                    <DropdownMenuItem onSelect={() => onRename(conversation)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={() => onArchive(conversation)}>
                    {conversation.archived ? (
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    {conversation.archived ? "Restore" : "Archive"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => onDelete(conversation)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {search
              ? "No matching conversations."
              : showArchived
                ? "No archived conversations."
                : "Start a new conversation to build your history."}
          </p>
        )}
      </div>
    </div>
  );
}

export function EmptyAssistant({
  questions,
  loading,
  error,
  onAsk,
}: {
  questions: ReturnType<typeof rankAdaptiveQuestions>;
  loading: boolean;
  error: boolean;
  onAsk: (question: string) => void;
}) {
  const backendBriefings = OWNER_BRIEFING_QUESTIONS.map((text) =>
    questions.find((question) => question.text === text)
  ).filter(
    (question): question is NonNullable<typeof question> =>
      question !== undefined
  );
  const featuredQuestions = backendBriefings.length
    ? backendBriefings
    : OWNER_BRIEFING_QUESTIONS.map((text, index) => ({
        id: `owner-briefing-${index}`,
        text,
        module: "GENERAL" as const,
        reason: "A concise owner briefing across live factory data.",
        category: "OPERATIONS" as const,
        valueSignal: "COLD_START" as const,
        rank: index + 1,
      }));
  const secondaryQuestions = questions.filter(
    (question) => !OWNER_BRIEFING_QUESTIONS.includes(
      question.text as (typeof OWNER_BRIEFING_QUESTIONS)[number]
    )
  );

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center py-8 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border bg-card/80 shadow-xl shadow-blue-500/10">
        <div className="ai-spark absolute -right-2 -top-2 h-3 w-3 rounded-full bg-cyan-400" />
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
        Your factory manager, in your pocket
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        One question brings production, inventory, workforce and finance
        together—so you see what changed, what needs attention and what to do
        first without opening every module.
      </p>
      <div className="mt-8 grid w-full gap-3 sm:grid-cols-3" aria-label="Owner daily briefing questions">
        {featuredQuestions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none ${
              index === 0
                ? "border-primary/40 bg-primary text-primary-foreground sm:col-span-3"
                : "bg-card/80 hover:border-primary/40"
            }`}
            onClick={() => onAsk(question.text)}
          >
            <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
              {index === 0 ? "Start today’s briefing" : "Owner focus"}
            </span>
            <span className="mt-2 block text-base font-semibold leading-6">
              {question.text}
            </span>
            {question.reason ? (
              <span className="mt-2 block text-xs leading-5 opacity-75">
                {question.reason}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="mt-3 grid w-full gap-3 sm:grid-cols-2" aria-label="Adaptive factory questions">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))
          : secondaryQuestions.map((question) => (
              <button
                key={question.id}
                type="button"
                className="rounded-2xl border bg-card/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none"
                onClick={() => onAsk(question.text)}
              >
                <span className="text-sm font-medium leading-5">
                  {question.text}
                </span>
                {question.reason ? (
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                    {question.reason}
                  </span>
                ) : null}
                <Badge variant="secondary" className="mt-3">
                  {question.module}
                </Badge>
              </button>
            ))}
      </div>
      {error ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          Personalized questions are temporarily unavailable. The owner briefing
          questions above remain available.
        </p>
      ) : null}
    </div>
  );
}

function ThinkingStatus() {
  return (
    <div className="flex items-center gap-3" role="status">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="inline-flex items-center gap-1">
          Checking relevant Factory1 records
          <span className="ai-thinking-dot">.</span>
          <span className="ai-thinking-dot ai-thinking-dot-2">.</span>
          <span className="ai-thinking-dot ai-thinking-dot-3">.</span>
        </span>
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5" role="status" aria-label="Loading conversation">
      <div className="h-24 w-3/4 animate-pulse rounded-2xl bg-muted" />
      <div className="ml-auto h-16 w-1/2 animate-pulse rounded-2xl bg-muted" />
      <div className="h-32 w-4/5 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function AssistantState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Bot className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function RenameDialog({
  conversation,
  loading,
  onClose,
  onRename,
}: {
  conversation: AiConversationSummary | null;
  loading: boolean;
  onClose: () => void;
  onRename: (title: string) => void;
}) {
  const [title, setTitle] = useState(conversation?.title ?? "");

  return (
    <Dialog open={Boolean(conversation)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>
            Use a short title that will be easy to find later.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && title.trim()) onRename(title.trim());
          }}
          autoFocus
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || !title.trim()}
            onClick={() => onRename(title.trim())}
          >
            <Check className="mr-2 h-4 w-4" />
            Save title
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function responseToLocalMessage(response: AiChatResponse): LocalMessage {
  return {
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
  };
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

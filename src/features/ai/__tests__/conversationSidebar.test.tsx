import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationSidebar } from "../components/AiAssistantPage";
import type { AiConversationSummary } from "../types/ai.types";

const conversation: AiConversationSummary = {
  id: "conversation-1",
  title: "Today’s factory briefing",
  currentModule: "GENERAL",
  dominantModule: "GENERAL",
  archived: false,
  createdAt: "2026-10-04T08:00:00",
  updatedAt: "2026-10-04T08:30:00",
  lastMessageAt: "2026-10-04T08:30:00",
  messageCount: 4,
  preview: "Three items need attention",
};

const baseProps = {
  selectedId: undefined,
  loading: false,
  error: false,
  search: "",
  showArchived: false,
  creating: false,
  onSearch: vi.fn(),
  onShowArchived: vi.fn(),
  onSelect: vi.fn(),
  onNew: vi.fn(),
  onRename: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
};

describe("conversation sidebar", () => {
  it("starts a new chat and resumes an existing conversation", async () => {
    const onNew = vi.fn();
    const onSelect = vi.fn();
    render(
      <ConversationSidebar
        {...baseProps}
        conversations={[conversation]}
        onNew={onNew}
        onSelect={onSelect}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /new chat/i }));
    await userEvent.click(
      screen.getByText("Today’s factory briefing").closest("button")!
    );
    expect(onNew).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("conversation-1");
  });

  it("exposes rename, archive and delete actions", async () => {
    const onRename = vi.fn();
    const onArchive = vi.fn();
    const onDelete = vi.fn();
    render(
      <ConversationSidebar
        {...baseProps}
        conversations={[conversation]}
        onRename={onRename}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: /actions for today’s factory briefing/i,
      })
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: /rename/i }));
    expect(onRename).toHaveBeenCalledWith(conversation);

    await userEvent.click(
      screen.getByRole("button", {
        name: /actions for today’s factory briefing/i,
      })
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: /archive/i }));
    expect(onArchive).toHaveBeenCalledWith(conversation);

    await userEvent.click(
      screen.getByRole("button", {
        name: /actions for today’s factory briefing/i,
      })
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(conversation);
  });

  it("renders loading, error and empty archive states", () => {
    const { rerender } = render(
      <ConversationSidebar {...baseProps} conversations={[]} loading />
    );
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(5);

    rerender(
      <ConversationSidebar
        {...baseProps}
        conversations={[]}
        loading={false}
        error
      />
    );
    expect(screen.getByText(/could not load conversations/i)).toBeInTheDocument();

    rerender(
      <ConversationSidebar
        {...baseProps}
        conversations={[]}
        showArchived
      />
    );
    expect(screen.getByText(/no archived conversations/i)).toBeInTheDocument();
  });
});

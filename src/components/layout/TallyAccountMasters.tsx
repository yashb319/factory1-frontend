"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import type {
  AccountGroup,
  AccountGroupType,
  AccountMasters,
  CreateAccountGroupRequest,
} from "@/features/accounting/types/accounting.types";

type TallyAccountMastersProps = {
  masters: AccountMasters | undefined;
  onBack: () => void;
  onCreateGroup: (request: CreateAccountGroupRequest) => Promise<unknown>;
  onUpdateGroup: (request: { id: string; name: string; parentGroupId: string | null; groupType: AccountGroupType; affectsGrossProfit: boolean }) => Promise<unknown>;
  onDeleteGroup: (id: string) => Promise<unknown>;
  isCreating: boolean;
  isUpdating: boolean;
};

type MastersScreen =
  | "list"
  | "create"
  | "alter"
  | "quitPrompt"
  | "deletePrompt";

const groupTypeLabels: Record<AccountGroupType, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

const groupTypeShortLabels: Record<AccountGroupType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  INCOME: "Income",
  EXPENSE: "Expense",
};

export function TallyAccountMasters({
  masters,
  onBack,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  isCreating,
  isUpdating,
}: TallyAccountMastersProps) {
  const groups = masters?.groups ?? [];
  const ledgers = masters?.ledgers ?? [];

  const [screen, setScreen] = useState<MastersScreen>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<AccountGroupType | "ALL">("ALL");
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const filteredGroups = useMemo(() => {
    if (filterType === "ALL") return groups;
    return groups.filter((g) => g.groupType === filterType);
  }, [groups, filterType]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterType]);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>(
      `[data-group-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const [formDraft, setFormDraft] = useState<{
    name: string;
    parentGroupId: string;
    groupType: AccountGroupType;
    affectsGrossProfit: boolean;
  }>({
    name: "",
    parentGroupId: "",
    groupType: "ASSET",
    affectsGrossProfit: false,
  });

  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);

  const openCreate = () => {
    setEditingGroup(null);
    setFormDraft({
      name: "",
      parentGroupId: "",
      groupType: "ASSET",
      affectsGrossProfit: false,
    });
    setScreen("create");
  };

  const openAlter = (group: AccountGroup) => {
    if (group.systemGroup) {
      toast.info("Default system group cannot be altered");
      return;
    }
    setEditingGroup(group);
    setFormDraft({
      name: group.name,
      parentGroupId: group.parentGroupId ?? "",
      groupType: group.groupType,
      affectsGrossProfit: group.affectsGrossProfit,
    });
    setScreen("alter");
  };

  const submitCreate = async () => {
    if (!formDraft.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await onCreateGroup({
        name: formDraft.name.trim(),
        parentGroupId: formDraft.parentGroupId || null,
        groupType: formDraft.groupType,
        affectsGrossProfit: formDraft.affectsGrossProfit,
      });
      toast.success("Group created");
      setScreen("list");
    } catch {
      toast.error("Could not create group");
    }
  };

  const submitAlter = async () => {
    if (!editingGroup) return;
    if (!formDraft.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await onUpdateGroup({
        id: editingGroup.id,
        name: formDraft.name.trim(),
        parentGroupId: formDraft.parentGroupId || null,
        groupType: formDraft.groupType,
        affectsGrossProfit: formDraft.affectsGrossProfit,
      });
      toast.success("Group altered");
      setScreen("list");
    } catch {
      toast.error("Could not alter group");
    }
  };

  const confirmDelete = async () => {
    if (!editingGroup) return;
    try {
      await onDeleteGroup(editingGroup.id);
      toast.success("Group deleted");
      setShowDeletePrompt(false);
      setScreen("list");
    } catch {
      toast.error("Could not delete group");
    }
  };

  const handleQuit = () => {
    setScreen("quitPrompt");
  };

  const parentGroupOptions = useMemo(() => {
    return groups.filter(
      (g) =>
        g.groupType === formDraft.groupType &&
        g.id !== editingGroup?.id
    );
  }, [groups, formDraft.groupType, editingGroup]);

  const getUnderLabel = (groupId: string) => {
    if (!groupId) return "---";
    const found = groups.find((g) => g.id === groupId);
    return found?.name ?? "---";
  };

  const topActions = [
    { key: "Ctrl+L", label: "Licence", enabled: false },
    { key: "Alt+E", label: "Export", enabled: false },
    { key: "Alt+G", label: "Go To", enabled: false },
    { key: "F4", label: "Contra", enabled: false },
    { key: "F5", label: "Payment", enabled: false },
    { key: "F6", label: "Receipt", enabled: false },
    { key: "F7", label: "Journal", enabled: false },
    { key: "F8", label: "Sales", enabled: false },
    { key: "F9", label: "Purchase", enabled: false },
    { key: "F12", label: "Configure", enabled: false },
  ];

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox"
      ) {
        if (event.key === "Escape" && screen !== "list") {
          event.preventDefault();
          setScreen("list");
          return;
        }
        return;
      }

      if (screen === "quitPrompt") {
        if (event.key === "Escape" || event.key.toLowerCase() === "n") {
          event.preventDefault();
          setScreen("list");
          return;
        }
        if (event.key === "Enter" || event.key.toLowerCase() === "y") {
          event.preventDefault();
          onBack();
          return;
        }
        return;
      }

      if (screen === "deletePrompt") {
        if (event.key === "Escape" || event.key.toLowerCase() === "n") {
          event.preventDefault();
          setShowDeletePrompt(false);
          return;
        }
        if (event.key === "Enter" || event.key.toLowerCase() === "y") {
          event.preventDefault();
          confirmDelete();
          return;
        }
        return;
      }

      if (screen === "create" || screen === "alter") {
        if (event.key === "Escape") {
          event.preventDefault();
          setScreen("list");
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
          event.preventDefault();
          if (screen === "create") submitCreate();
          else submitAlter();
          return;
        }
        return;
      }

      if (screen === "list") {
        if (event.key === "Escape") {
          event.preventDefault();
          handleQuit();
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((c) => Math.min(c + 1, filteredGroups.length - 1));
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((c) => Math.max(c - 1, 0));
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          setSelectedIndex(0);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          setSelectedIndex(Math.max(filteredGroups.length - 1, 0));
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          const group = filteredGroups[selectedIndex];
          if (group) openAlter(group);
          return;
        }

        if (event.key.toLowerCase() === "g") {
          event.preventDefault();
          openCreate();
          return;
        }

        if (event.key.toLowerCase() === "h") {
          event.preventDefault();
          toast.info("Ledger screen coming soon");
          return;
        }

        if (event.key.toLowerCase() === "o") {
          event.preventDefault();
          onBack();
          return;
        }

        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          const group = filteredGroups[selectedIndex];
          if (group && !group.systemGroup) {
            setEditingGroup(group);
            setShowDeletePrompt(true);
          } else if (group?.systemGroup) {
            toast.info("Default system group cannot be deleted");
          }
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    screen,
    selectedIndex,
    filteredGroups,
    onBack,
    editingGroup,
    formDraft,
    parentGroupOptions,
  ]);

  const selectedGroup = filteredGroups[selectedIndex];

  if (screen === "create" || screen === "alter") {
    return (
      <div className="tally-entry-screen" data-tally-nav-scope>
        <div className="tally-entry-title">
          <span>
            {screen === "create"
              ? "Account Group Creation"
              : "Account Group Alteration"}
          </span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
          <div className="mx-auto grid w-full max-w-lg gap-y-3">
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Name</span>
              <input
                autoFocus
                type="text"
                value={formDraft.name}
                onChange={(e) =>
                  setFormDraft((c) => ({ ...c, name: e.target.value }))
                }
                onFocus={(e) => e.currentTarget.select()}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Under</span>
              <select
                value={formDraft.parentGroupId}
                onChange={(e) =>
                  setFormDraft((c) => ({ ...c, parentGroupId: e.target.value }))
                }
                className="tally-select h-6 w-full"
              >
                <option value="">---</option>
                {parentGroupOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">
                Group Type
              </span>
              <select
                value={formDraft.groupType}
                onChange={(e) =>
                  setFormDraft((c) => ({
                    ...c,
                    groupType: e.target.value as AccountGroupType,
                    parentGroupId: "",
                  }))
                }
                className="tally-select h-6 w-full"
              >
                {(Object.keys(groupTypeLabels) as AccountGroupType[]).map(
                  (type) => (
                    <option key={type} value={type}>
                      {groupTypeLabels[type]}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">
                Affects Gross Profit
              </span>
              <input
                type="checkbox"
                checked={formDraft.affectsGrossProfit}
                onChange={(e) =>
                  setFormDraft((c) => ({
                    ...c,
                    affectsGrossProfit: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            Q: Back
          </button>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating || isUpdating}
            onClick={() => {
              playUiSound("post");
              if (screen === "create") submitCreate();
              else submitAlter();
            }}
          >
            A: Accept
          </button>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            D: Delete
          </span>
          <button
            type="button"
            className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            X: Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid min-h-7 grid-cols-2 border-b border-[#0F766E] bg-[#C8E6C9] text-xs sm:grid-cols-4 lg:grid-cols-8">
        {topActions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={!action.enabled}
            className={[
              "border-r border-[#0F766E] px-2 py-1 text-left",
              action.enabled
                ? "hover:bg-[#6366F1] hover:text-white"
                : "cursor-not-allowed text-slate-500 opacity-60",
            ].join(" ")}
            title={action.label}
          >
            <span
              className={[
                "font-bold",
                action.enabled ? "text-[#EF4444]" : "text-slate-500",
              ].join(" ")}
            >
              {action.key}
            </span>
            <span>: {action.label}</span>
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100%-7rem)] min-h-0 flex-col overflow-hidden">
        <div className="border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2">
          <div className="text-center text-sm font-bold">Account Masters</div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-bold">
              Groups{" "}
              <span className="font-normal text-slate-600">
                (Under: All Items)
              </span>
            </span>
            <span className="text-slate-600">
              {filteredGroups.length} groups
            </span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#C8E6C9]">
              <tr className="border-b border-[#0F766E] text-left">
                <th className="w-12 px-2 py-1">S.No.</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Under</th>
                <th className="px-2 py-1">Particulars</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group, index) => {
                const isSelected = index === selectedIndex;
                const ledgerCountForGroup = ledgers.filter(
                  (l) => l.accountGroupId === group.id
                ).length;

                return (
                  <tr
                    key={group.id}
                    data-group-index={index}
                    onClick={() => {
                      setSelectedIndex(index);
                      openAlter(group);
                    }}
                    className={[
                      "cursor-pointer border-b border-[#94A3B8]/40",
                      isSelected
                        ? "bg-[#0F172A] text-white"
                        : "hover:bg-[#6366F1]/10",
                    ].join(" ")}
                  >
                    <td className="px-2 py-0.5 text-center">{index + 1}</td>
                    <td className="px-2 py-0.5 font-semibold">{group.name}</td>
                    <td className="px-2 py-0.5">
                      {getUnderLabel(group.parentGroupId ?? "")}
                    </td>
                    <td className="px-2 py-0.5">
                      {group.systemGroup ? (
                        <span className="text-slate-500">System</span>
                      ) : (
                        <span>
                          {ledgerCountForGroup} ledger
                          {ledgerCountForGroup !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={openCreate}
        >
          G: Group
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => toast.info("Ledger screen coming soon")}
        >
          H: Ledger
        </button>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          O: Close
        </button>
      </div>

      {screen === "quitPrompt" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Quit?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div className="font-bold">Yes or No</div>
              <div className="text-[11px] text-slate-600">
                Press Enter or 'Y' to confirm, Escape or 'N' to cancel.
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  autoFocus
                  className="border border-[#0F766E] bg-[#0F172A] px-3 py-1 font-bold text-white"
                  onClick={onBack}
                >
                  Y: Yes
                </button>
                <button
                  type="button"
                  className="border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
                  onClick={() => setScreen("list")}
                >
                  N: No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeletePrompt && editingGroup && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Delete?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div className="font-bold">Yes or No</div>
              <div className="text-[11px] text-slate-600">
                Delete group &quot;{editingGroup.name}&quot;?
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  autoFocus
                  className="border border-[#0F766E] bg-[#0F172A] px-3 py-1 font-bold text-white"
                  onClick={confirmDelete}
                >
                  Y: Yes
                </button>
                <button
                  type="button"
                  className="border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
                  onClick={() => setShowDeletePrompt(false)}
                >
                  N: No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

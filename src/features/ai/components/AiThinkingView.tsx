import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

type Props = {
  thinking?: string[];
};

export function AiThinkingView({ thinking }: Props) {
  const [open, setOpen] = useState(false);

  if (!thinking || thinking.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-dashed bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <Brain className="h-3.5 w-3.5" />
        Thinking
        <span className="ml-1 rounded bg-background px-1.5 text-[10px]">
          {thinking.length}
        </span>
      </button>
      {open ? (
        <ol className="space-y-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
          {thinking.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {index + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

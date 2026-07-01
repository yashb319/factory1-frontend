import { Bot } from "lucide-react";

type AIInsightCardProps = {
  title?: string;
  insights: string[];
};

export function AIInsightCard({
  title = "AI Insights",
  insights,
}: AIInsightCardProps) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-blue-600 p-2 text-white">
          <Bot size={18} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">
            Smart observations from your factory data
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {insights.map((item) => (
          <li key={item} className="text-sm text-slate-700">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerAiInsight } from "../types/customer.types";
import { getSeverityClass } from "../utils/customerHelpers";

type Props = {
  insights?: CustomerAiInsight[];
  isLoading?: boolean;
};

export function CustomerAiInsights({ insights = [], isLoading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Factory1 Customer Insights</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading insights...
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={`${insight.type}-${insight.title}`}
                className={`rounded-lg border px-4 py-3 text-sm ${getSeverityClass(
                  insight.severity
                )}`}
              >
                <div className="font-medium">{insight.title}</div>
                <div className="mt-1 opacity-80">{insight.description}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
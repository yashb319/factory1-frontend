import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { HealthCheckQuestion } from "../config";
import type { HealthCheckAnswerValue } from "../types";

type Props = {
  question: HealthCheckQuestion;
  value?: HealthCheckAnswerValue;
  error?: string;
  onChange: (value: HealthCheckAnswerValue) => void;
};

export function QuestionField({ question, value, error, onChange }: Props) {
  const errorId = `${question.id}-error`;
  const descriptionId = question.description ? `${question.id}-description` : undefined;

  return (
    <fieldset
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      aria-describedby={[descriptionId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
      aria-invalid={Boolean(error)}
    >
      <legend className="px-1 text-base font-semibold text-slate-950">
        {question.label}
      </legend>
      {question.description && (
        <p id={descriptionId} className="mb-3 mt-1 text-sm text-slate-500">
          {question.description}
        </p>
      )}

      {question.type === "radio" ? (
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {question.options.map((option) => (
            <Label
              key={option.value}
              htmlFor={`${question.id}-${option.value}`}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal transition-colors has-[[data-state=checked]]:border-blue-600 has-[[data-state=checked]]:bg-blue-50"
            >
              <RadioGroupItem id={`${question.id}-${option.value}`} value={option.value} />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option.value);
            return (
              <Label
                key={option.value}
                htmlFor={`${question.id}-${option.value}`}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal transition-colors has-[[data-state=checked]]:border-blue-600 has-[[data-state=checked]]:bg-blue-50"
              >
                <Checkbox
                  id={`${question.id}-${option.value}`}
                  checked={selected}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(value) ? value : [];
                    if (question.id === "employee_challenges" && option.value === "NONE" && checked) {
                      onChange(["NONE"]);
                      return;
                    }
                    const withoutNone = current.filter((item) => item !== "NONE");
                    onChange(
                      checked
                        ? [...withoutNone, option.value]
                        : current.filter((item) => item !== option.value)
                    );
                  }}
                />
                {option.label}
              </Label>
            );
          })}
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

type FieldHelperProps = {
  text?: string;
};

export function FieldHelper({ text }: FieldHelperProps) {
  if (!text) return null;

  return <p className="text-xs text-slate-500">{text}</p>;
}
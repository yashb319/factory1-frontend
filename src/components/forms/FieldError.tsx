type FieldErrorProps = {
  message?: string;
};

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
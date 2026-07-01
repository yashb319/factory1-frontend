type PageSectionProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function PageSection({
  title,
  description,
  actions,
  children,
}: PageSectionProps) {
  return (
    <section className="rounded-xl border bg-white">
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            )}

            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>

          {actions}
        </div>
      )}

      <div className="p-5">{children}</div>
    </section>
  );
}
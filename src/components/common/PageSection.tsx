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
    <section className="rounded-lg border border-[var(--factory1-border)] bg-white">
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--factory1-border)] bg-[var(--factory1-background)] px-4 py-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-[var(--factory1-text-primary)]">{title}</h2>
            )}

            {description && (
              <p className="mt-1 text-sm text-[var(--factory1-text-muted)]">{description}</p>
            )}
          </div>

          {actions}
        </div>
      )}

      <div className="p-4">{children}</div>
    </section>
  );
}

type AppPageProps = {
  children: React.ReactNode;
};

export function AppPage({ children }: AppPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {children}
    </div>
  );
}
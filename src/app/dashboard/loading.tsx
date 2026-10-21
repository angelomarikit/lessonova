export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-9 w-64 max-w-full rounded-lg bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted/80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-muted/70" />
        <div className="h-24 rounded-2xl bg-muted/70" />
        <div className="h-24 rounded-2xl bg-muted/70" />
      </div>
      <div className="h-72 rounded-2xl bg-muted/60" />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function OverviewGreeting({ name }: { name: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {getGreeting()}, {name}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Here&apos;s what&apos;s happening with your lessons today.
      </h1>
    </div>
  );
}

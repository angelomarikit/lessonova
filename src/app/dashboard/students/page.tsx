import { Suspense } from "react";

import { StudentsManager } from "@/components/students/students-manager";

export default function StudentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading students…</p>}>
      <StudentsManager />
    </Suspense>
  );
}

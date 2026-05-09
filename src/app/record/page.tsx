"use client";

import { Suspense } from "react";
import { RecordFlow } from "./record-flow";

export default function RecordPage() {
  return (
    <main className="flex flex-1 flex-col bg-[var(--background)]">
      <Suspense fallback={null}>
        <RecordFlow />
      </Suspense>
    </main>
  );
}

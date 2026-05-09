export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Offline
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          잠시 길을 잃었어요
        </h1>
        <p className="max-w-sm text-sm leading-6 text-zinc-400">
          연결이 돌아오면 그 장소가 어떻게 느껴졌는지 다시 이어서
          기록할 수 있어요.
        </p>
      </div>
    </main>
  );
}

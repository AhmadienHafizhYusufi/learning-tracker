"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <h2 className="font-semibold">Terjadi kesalahan</h2>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <p className="mt-1 text-xs text-muted">
        Pastikan database sudah jalan (<code className="num">npm run db:up</code>).
      </p>
      <button onClick={reset} className="btn-ghost mt-4">
        Coba lagi
      </button>
    </div>
  );
}

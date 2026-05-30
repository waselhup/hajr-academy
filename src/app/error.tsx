"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error to the browser console + server logs for diagnosis.
    console.error("[GlobalError]", error?.message, error?.digest, error?.stack);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-ivory p-6 text-center">
      <span className="text-6xl font-extrabold text-brand-rose">500</span>
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">Something went wrong / حدث خطأ</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred.
      </p>
      {(error?.message || error?.digest) && (
        <pre className="mt-3 max-w-xl overflow-auto whitespace-pre-wrap rounded-md bg-white/70 p-3 text-left text-xs text-red-700">
          {error?.message}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      )}
      <Button onClick={reset} className="mt-6">
        Retry / إعادة المحاولة
      </Button>
    </div>
  );
}

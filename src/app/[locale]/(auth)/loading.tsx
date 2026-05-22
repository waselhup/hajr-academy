import { Loader2 } from "lucide-react";

/** Loading UI for the auth pages (login, register, password flows). */
export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-ivory">
      <Loader2 className="h-8 w-8 animate-spin text-brand-rose" />
    </div>
  );
}

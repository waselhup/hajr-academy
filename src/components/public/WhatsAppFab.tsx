import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

// The number is no longer a placeholder: it comes from the one WhatsApp
// module the rest of the site uses, so the FAB can never drift away from the
// line the academy actually answers. The visible-above-bottom-nav padding
// lives in the mobile layout — this component just renders the FAB.
export function WhatsAppFab({ label, message }: { label: string; message: string }) {
  const href = whatsappLink(message);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-40 end-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform duration-150 hover:scale-105 hover:bg-emerald-600 sm:bottom-24 sm:end-6"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}

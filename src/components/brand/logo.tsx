import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {light ? (
        <span className="flex items-baseline gap-1 font-en">
          <span className="text-2xl font-extrabold tracking-tighter text-white">HAJR</span>
          <span className="h-6 w-px bg-brand-rose" />
          <span className="text-xl font-extrabold text-brand-rose">A</span>
          <span className="-ms-1 text-sm text-brand-rose">°</span>
        </span>
      ) : (
        <Image src="/hajr-logo.svg" alt="HAJR A°" width={140} height={44} priority />
      )}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-0.5", className)}>
      <span className="text-xl font-extrabold text-brand-rose">A</span>
      <span className="text-xs text-brand-rose">°</span>
    </div>
  );
}

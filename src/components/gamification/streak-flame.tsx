import { Flame } from "lucide-react";

export function StreakFlame({ days, big = false }: { days: number; big?: boolean }) {
  const color =
    days >= 30 ? "text-amber-500" :
    days >= 7 ? "text-orange-500" :
    days >= 3 ? "text-yellow-500" :
    "text-hajr-gray-400";
  return (
    <div className="inline-flex items-center gap-1">
      <Flame className={`${big ? "h-6 w-6" : "h-4 w-4"} ${color}`} />
      <span className={`${big ? "text-lg font-bold" : "text-sm font-semibold"} ${color}`}>
        {days}
      </span>
    </div>
  );
}

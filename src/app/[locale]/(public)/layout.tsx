import { Suspense } from "react";
import { TrafficTracker } from "@/components/analytics/traffic-tracker";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/*
        Suspense is required, not optional: the tracker reads useSearchParams
        (to capture utm_* from ad clicks), and without a boundary Next opts the
        entire public site out of static rendering — which would slow down the
        very landing pages the ads point at.

        Rendered after children so tracking never delays first paint.
      */}
      <Suspense fallback={null}>
        <TrafficTracker />
      </Suspense>
    </>
  );
}

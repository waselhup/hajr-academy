import { PageSkeleton } from "@/components/shared/page-skeleton";

/**
 * Route-group loading UI for the authenticated app.
 *
 * Next.js renders this instantly on navigation while the target server
 * component streams — turning a frozen transition into a snappy one.
 */
export default function AppLoading() {
  return <PageSkeleton />;
}

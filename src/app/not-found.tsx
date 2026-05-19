import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-ivory p-6 text-center">
      <span className="text-6xl font-extrabold text-brand-rose">404</span>
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">Not Found / غير موجود</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you requested could not be found. — لم نتمكن من العثور على الصفحة المطلوبة.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Home / الرئيسية</Link>
      </Button>
    </div>
  );
}

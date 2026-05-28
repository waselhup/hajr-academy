import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAdminManual } from "@/lib/manuals/admin-manual";
import { buildTeacherManual } from "@/lib/manuals/teacher-manual";
import { buildStudentManual } from "@/lib/manuals/student-manual";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // jszip is present as a transitive dependency — pull dynamically so
  // bundlers don't choke if it's hoisted.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const JSZipMod: any = await import("jszip").catch(() => null);
  if (!JSZipMod) {
    return NextResponse.json(
      { error: "ZIP_UNAVAILABLE", message: "jszip not available — download individual manuals instead." },
      { status: 500 }
    );
  }
  const JSZip = JSZipMod.default ?? JSZipMod;
  const zip = new JSZip();

  zip.file("admin-manual-en.html", buildAdminManual("en"));
  zip.file("admin-manual-ar.html", buildAdminManual("ar"));
  zip.file("teacher-manual-en.html", buildTeacherManual("en"));
  zip.file("teacher-manual-ar.html", buildTeacherManual("ar"));
  zip.file("student-manual-en.html", buildStudentManual("en"));
  zip.file("student-manual-ar.html", buildStudentManual("ar"));

  const buf: Buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="hajr-academy-manuals-all.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

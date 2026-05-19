import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  return NextResponse.json({
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
    preferredLang: session.user.preferredLang,
  });
}

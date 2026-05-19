import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSaudiPhone } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["STUDENT", "PARENT"]),
  preferredLang: z.enum(["AR", "EN"]).default("AR"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, name, nameAr, phone, role, preferredLang } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const normalizedPhone = phone ? normalizeSaudiPhone(phone) : null;
    if (phone && !normalizedPhone) {
      return NextResponse.json({ error: "Invalid Saudi phone" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        nameAr,
        phone: normalizedPhone,
        role,
        preferredLang,
        ...(role === "STUDENT" ? { studentProfile: { create: {} } } : {}),
        ...(role === "PARENT" ? { parentProfile: { create: {} } } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
        metadata: { role },
      },
    });

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

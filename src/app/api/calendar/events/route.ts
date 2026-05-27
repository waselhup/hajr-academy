import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyMany } from "@/lib/notify";
import {
  getCalendarEvents,
  createPersonalEvent,
  createGlobalEvent,
} from "@/lib/calendar";
import type { CalendarEventType, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const EVENT_TYPES: CalendarEventType[] = [
  "CLASS",
  "EXAM",
  "HOLIDAY",
  "MEETING",
  "PAYMENT_DUE",
  "PLACEMENT_TEST",
  "SPEAKING_CLUB",
  "DEADLINE",
  "CUSTOM",
];

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "MARKETER",
];

const createSchema = z.object({
  type: z.enum(EVENT_TYPES as [string, ...string[]]),
  title: z.string().min(1).max(200),
  titleAr: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  allDay: z.boolean().optional(),
  classId: z.string().optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  audienceRole: z.enum(ROLES as [string, ...string[]]).optional(),
  isGlobal: z.boolean().optional(),
});

/** GET /api/calendar/events?from=&to=&types=CLASS,EXAM */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const fromStr = sp.get("from");
    const toStr = sp.get("to");
    const from = fromStr ? new Date(fromStr) : startOfMonth(new Date());
    const to = toStr ? new Date(toStr) : endOfMonth(new Date());
    const typesParam = sp.get("types");
    const types = typesParam
      ? (typesParam
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => EVENT_TYPES.includes(s as CalendarEventType)) as CalendarEventType[])
      : undefined;

    const events = await getCalendarEvents({
      userId: session.user.id,
      role: session.user.role,
      from,
      to,
      types,
    });

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        titleAr: e.titleAr,
        description: e.description,
        descriptionAr: e.descriptionAr,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
        allDay: e.allDay,
        userId: e.userId,
        classId: e.classId,
        teacherId: e.teacherId,
        studentId: e.studentId,
        audienceRole: e.audienceRole,
        isGlobal: e.isGlobal,
        createdBy: e.createdBy,
      })),
    });
  } catch (e) {
    console.error("[api/calendar/events] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load events" },
      { status: 500 }
    );
  }
}

/** POST /api/calendar/events */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

  // Only admins can create global or audience-scoped events.
  if (!isAdmin && (data.isGlobal || data.audienceRole)) {
    return NextResponse.json(
      { error: "Only admins can create global or audience events" },
      { status: 403 }
    );
  }
  if (data.endAt.getTime() < data.startAt.getTime()) {
    return NextResponse.json(
      { error: "endAt must be >= startAt" },
      { status: 400 }
    );
  }

  let created;
  if (data.isGlobal || data.audienceRole) {
    created = await createGlobalEvent({
      type: data.type as CalendarEventType,
      title: data.title,
      titleAr: data.titleAr,
      description: data.description,
      descriptionAr: data.descriptionAr,
      startAt: data.startAt,
      endAt: data.endAt,
      allDay: data.allDay,
      classId: data.classId ?? null,
      teacherId: data.teacherId ?? null,
      studentId: data.studentId ?? null,
      audienceRole: (data.audienceRole as Role | undefined) ?? null,
      isGlobal: !!data.isGlobal,
      createdBy: session.user.id,
    });
  } else {
    created = await createPersonalEvent({
      type: data.type as CalendarEventType,
      title: data.title,
      titleAr: data.titleAr,
      description: data.description,
      descriptionAr: data.descriptionAr,
      startAt: data.startAt,
      endAt: data.endAt,
      allDay: data.allDay,
      userId: session.user.id,
      classId: data.classId ?? null,
      teacherId: data.teacherId ?? null,
      studentId: data.studentId ?? null,
      createdBy: session.user.id,
    });
  }

  await audit.mutation(
    session.user.id,
    "CALENDAR_EVENT_CREATED",
    "CalendarEvent",
    created.id,
    { type: created.type, isGlobal: created.isGlobal }
  );

  // If admin posted a global/audience event, push an in-app notification to
  // the affected users so the bell pulses.
  if (isAdmin && (created.isGlobal || created.audienceRole)) {
    try {
      const recipients = await prisma.user.findMany({
        where: created.audienceRole
          ? { role: created.audienceRole, isActive: true }
          : { isActive: true },
        select: { id: true },
      });
      await notifyMany(
        recipients.map((r) => r.id).filter((id) => id !== session.user.id),
        {
          type: "SYSTEM_ANNOUNCEMENT",
          title: created.title,
          titleAr: created.titleAr,
          body: created.description ?? created.title,
          bodyAr: created.descriptionAr ?? created.titleAr,
          channels: ["inApp"],
          actionUrl: "/calendar",
          refType: "CalendarEvent",
          refId: created.id,
        }
      );
    } catch (e) {
      console.error("[api/calendar/events] notify fan-out failed:", e);
    }
  }

  return NextResponse.json({ event: created }, { status: 201 });
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

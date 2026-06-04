/**
 * POST /api/admin/certificates  — issue new certificate
 * GET                          — list certificates
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import {
  generateCertificateHtml,
  newVerificationCode,
} from "@/lib/certificates/generator";
import {
  uploadToBucket,
  getPublicUrl,
} from "@/lib/storage/sprint4-storage";
import type { CertificateType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  const type = url.searchParams.get("type");
  const certs = await prisma.certificate.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(type ? { type: type as CertificateType } : {}),
    },
    include: {
      student: { include: { user: { select: { name: true, nameAr: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ ok: true, certificates: certs });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN");
  const body = (await req.json().catch(() => ({}))) as {
    studentId?: string;
    type?: CertificateType;
    titleAr?: string;
    titleEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    cefrLevel?: string;
    score?: number;
    expiryDate?: string;
  };
  if (!body.studentId || !body.type || !body.titleAr || !body.titleEn) {
    return NextResponse.json(
      { ok: false, error: "studentId, type, titleAr, titleEn required" },
      { status: 400 }
    );
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: body.studentId },
    include: {
      user: true,
      parentLinks: { include: { parent: { include: { user: true } } } },
    },
  });
  if (!student) {
    return NextResponse.json({ ok: false, error: "student not found" }, { status: 404 });
  }

  const verificationCode = newVerificationCode();
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://hajr-academy.vercel.app"}/ar/verify/${verificationCode}`;

  const { html, qrDataUrl } = await generateCertificateHtml({
    type: body.type,
    titleAr: body.titleAr,
    titleEn: body.titleEn,
    descriptionAr: body.descriptionAr,
    descriptionEn: body.descriptionEn,
    studentName: student.user.name,
    studentNameAr: student.user.nameAr,
    issueDate: new Date(),
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
    cefrLevel: body.cefrLevel,
    score: body.score ?? null,
    verificationCode,
    verifyUrl,
  });

  const path = `${new Date().getFullYear()}/${verificationCode}.html`;
  // Content type is plain "text/html" (no charset param): the certificates
  // bucket's allowed_mime_types matches the type string verbatim, so a
  // "; charset=utf-8" suffix is rejected (HTTP 415). The charset is already
  // declared inside the document via <meta charset="UTF-8">.
  const up = await uploadToBucket({
    bucket: "certificates",
    path,
    body: html,
    contentType: "text/html",
  });
  if (!up.ok) {
    console.error("[admin-certificates] document upload failed:", up.error);
  }
  const pdfUrl = up.ok
    ? getPublicUrl("certificates", path)
    : verifyUrl;

  const cert = await prisma.certificate.create({
    data: {
      studentId: body.studentId,
      type: body.type,
      titleAr: body.titleAr,
      titleEn: body.titleEn,
      descriptionAr: body.descriptionAr ?? null,
      descriptionEn: body.descriptionEn ?? null,
      issueDate: new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      cefrLevel: body.cefrLevel ?? null,
      score: body.score ?? null,
      pdfUrl,
      pdfPath: up.ok ? path : null,
      qrCodeUrl: qrDataUrl,
      verificationCode,
      issuedById: session.user.id,
    },
  });

  // Notify student
  await Promise.allSettled([
    notify({
      userId: student.user.id,
      type: "CERTIFICATE_ISSUED",
      title: `Certificate issued: ${body.titleEn}`,
      titleAr: `شهادة جديدة: ${body.titleAr}`,
      body: `Your certificate is ready to download and share.`,
      bodyAr: `شهادتك جاهزة للتنزيل والمشاركة`,
      channels: ["inApp", "email"],
      actionUrl: `/ar/student/certificates`,
      actionLabel: "View",
      actionLabelAr: "عرض",
      priority: "NORMAL",
      refType: "Certificate",
      refId: cert.id,
    }),
    ...student.parentLinks.map((l) =>
      notify({
        userId: l.parent.user.id,
        type: "CERTIFICATE_ISSUED",
        title: `Certificate issued for ${student.user.name}`,
        titleAr: `شهادة جديدة لـ ${student.user.nameAr || student.user.name}`,
        body: `Your child has earned a certificate.`,
        bodyAr: `حصل ابنك على شهادة جديدة`,
        channels: ["inApp", "email"],
        priority: "NORMAL",
        refType: "Certificate",
        refId: cert.id,
      })
    ),
  ]);

  await audit.mutation(
    session.user.id,
    "CERTIFICATE_ISSUED",
    "Certificate",
    cert.id,
    { studentId: body.studentId, type: body.type, code: verificationCode }
  );

  return NextResponse.json({ ok: true, certificate: cert });
}

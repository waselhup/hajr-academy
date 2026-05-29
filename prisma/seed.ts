import { PrismaClient, Role, EnglishLevel, Gender, ProgramType, PackageType, ClassStatus, DayOfWeek, SessionStatus, AttendanceStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding HAJR A° Academy...");

  // ─── Programs ───
  const programs = [
    { code: "STEP_PREP", nameEn: "STEP Preparation", nameAr: "الإعداد لاختبار ستيب", descriptionEn: "Intensive prep for the Saudi STEP English exam.", descriptionAr: "تحضير مكثف لاختبار ستيب للغة الإنجليزية.", type: ProgramType.GROUP, defaultPriceSar: "400.00", durationHours: 16 },
    { code: "PRIVATE", nameEn: "Private Lessons", nameAr: "دروس خصوصية", descriptionEn: "One-on-one personalized tutoring.", descriptionAr: "دروس فردية مخصصة لاحتياجاتك.", type: ProgramType.PRIVATE, defaultPriceSar: "800.00", durationHours: 16 },
    { code: "UNI_PREP", nameEn: "University Preparation", nameAr: "الإعداد للجامعة", descriptionEn: "Academic English for university entrance and study.", descriptionAr: "اللغة الأكاديمية للقبول والدراسة الجامعية.", type: ProgramType.GROUP, defaultPriceSar: "400.00", durationHours: 16 },
    { code: "SCHOOL", nameEn: "School Support", nameAr: "دعم المدارس", descriptionEn: "Curriculum-aligned support for partner schools.", descriptionAr: "دعم متوافق مع منهج المدارس الشريكة.", type: ProgramType.B2B, defaultPriceSar: "0.00", durationHours: null },
    { code: "ENGLISH_LAB", nameEn: "English Lab", nameAr: "مختبر اللغة الإنجليزية", descriptionEn: "Self-paced practice for Speaking, Listening, Writing, Reading.", descriptionAr: "تدريب ذاتي على المحادثة والاستماع والكتابة والقراءة.", type: ProgramType.SELF_STUDY, defaultPriceSar: "0.00", durationHours: null },
  ];

  for (const p of programs) {
    await prisma.program.upsert({
      where: { code: p.code },
      create: p as any,
      update: p as any,
    });
  }
  console.log("✓ 5 programs seeded");

  // ─── Users ───
  const hash = await bcrypt.hash("Hajr@2026", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@hajracademy.com" },
    update: {},
    create: {
      email: "superadmin@hajracademy.com",
      passwordHash: hash,
      name: "Sultan Al-Rashed",
      nameAr: "سلطان الراشد",
      phone: "+966500000001",
      role: Role.SUPER_ADMIN,
      emailVerified: true,
    },
  });

  const admin1 = await prisma.user.upsert({
    where: { email: "admin@hajracademy.com" },
    update: {},
    create: {
      email: "admin@hajracademy.com",
      passwordHash: hash,
      name: "Reem Al-Ghamdi",
      nameAr: "ريم الغامدي",
      phone: "+966500000002",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: "admin2@hajracademy.com" },
    update: {},
    create: {
      email: "admin2@hajracademy.com",
      passwordHash: hash,
      name: "Faisal Al-Qahtani",
      nameAr: "فيصل القحطاني",
      phone: "+966500000003",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  // ─── Teachers ───
  const teacherSeeds = [
    { email: "abdullah.t@hajracademy.com", name: "Abdullah Al-Otaibi", nameAr: "عبدالله العتيبي", phone: "+966550000001", specializations: ["STEP", "GENERAL"], salaryBase: "6500.00", zoomHostEmail: "host1@hajracademy.com" },
    { email: "noura.t@hajracademy.com", name: "Noura Al-Shahrani", nameAr: "نورة الشهراني", phone: "+966550000002", specializations: ["IELTS", "UNIVERSITY_PREP"], salaryBase: "7000.00", zoomHostEmail: "host2@hajracademy.com" },
    { email: "khalid.t@hajracademy.com", name: "Khalid Al-Harbi", nameAr: "خالد الحربي", phone: "+966550000003", specializations: ["STEP", "UNIVERSITY_PREP"], salaryBase: "6800.00", zoomHostEmail: "host3@hajracademy.com" },
    { email: "lama.t@hajracademy.com", name: "Lama Al-Dosari", nameAr: "لمى الدوسري", phone: "+966550000004", specializations: ["GENERAL", "IELTS"], salaryBase: "6500.00", zoomHostEmail: "host4@hajracademy.com" },
  ];

  const teachers = [];
  for (const t of teacherSeeds) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        passwordHash: hash,
        name: t.name,
        nameAr: t.nameAr,
        phone: t.phone,
        role: Role.TEACHER,
        emailVerified: true,
        teacherProfile: {
          create: {
            specializations: t.specializations,
            salaryBase: t.salaryBase as any,
            zoomHostEmail: t.zoomHostEmail,
            bio: `Certified English teacher specialising in ${t.specializations.join(", ")}.`,
            rating: "4.80" as any,
          },
        },
      },
      include: { teacherProfile: true },
    });
    teachers.push(user);
  }
  console.log("✓ 4 teachers seeded");

  // ─── Partner School ───
  const school = await prisma.partnerSchool.upsert({
    where: { id: "seed-school-1" },
    update: {},
    create: {
      id: "seed-school-1",
      nameEn: "Riyadh International Academy",
      nameAr: "أكاديمية الرياض الدولية",
      contactName: "Mansour Al-Mutairi",
      contactEmail: "contact@ria.edu.sa",
      contactPhone: "+966112000000",
      city: "Riyadh",
      contractStart: new Date("2026-01-01"),
      contractEnd: new Date("2026-12-31"),
      monthlyFeeSar: "15000.00" as any,
      studentCap: 50,
    },
  });
  console.log("✓ 1 partner school seeded");

  // ─── Students ─── 6 male + 6 female
  const studentMaleSeeds = [
    { email: "ali.s@example.com", name: "Ali Al-Otaibi", nameAr: "علي العتيبي" },
    { email: "omar.s@example.com", name: "Omar Al-Saud", nameAr: "عمر آل سعود" },
    { email: "yousef.s@example.com", name: "Yousef Al-Zahrani", nameAr: "يوسف الزهراني" },
    { email: "fahad.s@example.com", name: "Fahad Al-Rashid", nameAr: "فهد الراشد" },
    { email: "mohammed.s@example.com", name: "Mohammed Al-Anazi", nameAr: "محمد العنزي" },
    { email: "saad.s@example.com", name: "Saad Al-Mutairi", nameAr: "سعد المطيري" },
  ];
  const studentFemaleSeeds = [
    { email: "sara.s@example.com", name: "Sara Al-Qahtani", nameAr: "سارة القحطاني" },
    { email: "hessa.s@example.com", name: "Hessa Al-Faisal", nameAr: "حصة الفيصل" },
    { email: "maha.s@example.com", name: "Maha Al-Shamri", nameAr: "مها الشمري" },
    { email: "razan.s@example.com", name: "Razan Al-Ghamdi", nameAr: "رزان الغامدي" },
    { email: "lina.s@example.com", name: "Lina Al-Harbi", nameAr: "لينا الحربي" },
    { email: "nada.s@example.com", name: "Nada Al-Yami", nameAr: "ندى اليامي" },
  ];

  const students = [];
  for (const [i, s] of studentMaleSeeds.entries()) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: hash,
        name: s.name,
        nameAr: s.nameAr,
        phone: `+9665600000${String(i + 10).padStart(2, "0")}`,
        role: Role.STUDENT,
        emailVerified: true,
        studentProfile: {
          create: {
            birthDate: new Date(`2008-0${(i % 9) + 1}-15`),
            gradeLevel: i < 3 ? `Grade ${10 + i}` : "University Year 1",
            englishLevel: i % 3 === 0 ? EnglishLevel.BEGINNER : i % 3 === 1 ? EnglishLevel.INTERMEDIATE : EnglishLevel.ADVANCED,
            gender: Gender.MALE,
            activePackage: i % 2 === 0 ? PackageType.INTEGRATED : PackageType.ESSENTIAL,
            packageStartedAt: new Date("2026-05-01"),
            packageExpiresAt: new Date("2026-12-31"),
            schoolId: i < 2 ? school.id : null,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(u);
  }
  for (const [i, s] of studentFemaleSeeds.entries()) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: hash,
        name: s.name,
        nameAr: s.nameAr,
        phone: `+9665700000${String(i + 10).padStart(2, "0")}`,
        role: Role.STUDENT,
        emailVerified: true,
        studentProfile: {
          create: {
            birthDate: new Date(`2008-0${(i % 9) + 1}-20`),
            gradeLevel: i < 3 ? `Grade ${10 + i}` : "University Year 1",
            englishLevel: i % 3 === 0 ? EnglishLevel.INTERMEDIATE : EnglishLevel.ADVANCED,
            gender: Gender.FEMALE,
            activePackage: i % 2 === 0 ? PackageType.INTEGRATED : PackageType.PRIVATE,
            packageStartedAt: new Date("2026-05-01"),
            packageExpiresAt: new Date("2026-12-31"),
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(u);
  }
  console.log("✓ 12 students seeded (6M + 6F)");

  // ─── Parents ─── 6 parents linked to 12 children
  const parentSeeds = [
    { email: "abu.ali@example.com", name: "Mohammed Al-Otaibi", nameAr: "محمد العتيبي" },
    { email: "umm.omar@example.com", name: "Aisha Al-Saud", nameAr: "عائشة آل سعود" },
    { email: "abu.yousef@example.com", name: "Khalid Al-Zahrani", nameAr: "خالد الزهراني" },
    { email: "umm.fahad@example.com", name: "Latifa Al-Rashid", nameAr: "لطيفة الراشد" },
    { email: "abu.sara@example.com", name: "Salem Al-Qahtani", nameAr: "سالم القحطاني" },
    { email: "umm.hessa@example.com", name: "Norah Al-Faisal", nameAr: "نورة الفيصل" },
  ];

  for (const [i, p] of parentSeeds.entries()) {
    const parent = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: hash,
        name: p.name,
        nameAr: p.nameAr,
        phone: `+9665800000${String(i + 10).padStart(2, "0")}`,
        role: Role.PARENT,
        emailVerified: true,
        parentProfile: {
          create: { occupation: i % 2 === 0 ? "Government" : "Private sector" },
        },
      },
      include: { parentProfile: true },
    });
    if (parent.parentProfile && students[i] && students[i + 6]) {
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: parent.parentProfile.id, studentId: students[i].studentProfile!.id } },
        update: {},
        create: { parentId: parent.parentProfile.id, studentId: students[i].studentProfile!.id, isPrimary: true },
      });
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: parent.parentProfile.id, studentId: students[i + 6].studentProfile!.id } },
        update: {},
        create: { parentId: parent.parentProfile.id, studentId: students[i + 6].studentProfile!.id, isPrimary: false },
      });
    }
  }
  console.log("✓ 6 parents seeded + linked");

  // ─── Classes ───
  const stepProgram = await prisma.program.findUniqueOrThrow({ where: { code: "STEP_PREP" } });
  const uniProgram = await prisma.program.findUniqueOrThrow({ where: { code: "UNI_PREP" } });

  const class1 = await prisma.class.upsert({
    where: { cohortCode: "STEP-2026-Q2-A" },
    update: {},
    create: {
      cohortCode: "STEP-2026-Q2-A",
      programId: stepProgram.id,
      name: "STEP Prep — Male Cohort A",
      nameAr: "ستيب — مجموعة الشباب أ",
      teacherId: teachers[0].teacherProfile!.id,
      scheduleDays: [DayOfWeek.SUNDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY],
      timeSlot: "18:00",
      durationMinutes: 60,
      maxStudents: 6,
      genderRestriction: Gender.MALE,
      pricePerMonth: "400.00" as any,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-07-31"),
      status: ClassStatus.ACTIVE,
    },
  });

  const class2 = await prisma.class.upsert({
    where: { cohortCode: "UNI-2026-Q2-F" },
    update: {},
    create: {
      cohortCode: "UNI-2026-Q2-F",
      programId: uniProgram.id,
      name: "Uni Prep — Female Cohort",
      nameAr: "الإعداد للجامعة — مجموعة الفتيات",
      teacherId: teachers[1].teacherProfile!.id,
      scheduleDays: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
      timeSlot: "17:00",
      durationMinutes: 90,
      maxStudents: 6,
      genderRestriction: Gender.FEMALE,
      pricePerMonth: "400.00" as any,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-07-31"),
      status: ClassStatus.ACTIVE,
    },
  });
  console.log("✓ 2 classes seeded");

  // ─── Enrollments ─── all 6 male students → class1, all 6 female → class2
  const maleStudents = students.slice(0, 6);
  const femaleStudents = students.slice(6, 12);
  for (const s of maleStudents) {
    await prisma.enrollment.upsert({
      where: { studentId_classId: { studentId: s.studentProfile!.id, classId: class1.id } },
      update: {},
      create: { studentId: s.studentProfile!.id, classId: class1.id },
    });
  }
  for (const s of femaleStudents) {
    await prisma.enrollment.upsert({
      where: { studentId_classId: { studentId: s.studentProfile!.id, classId: class2.id } },
      update: {},
      create: { studentId: s.studentProfile!.id, classId: class2.id },
    });
  }
  console.log("✓ 12 enrollments seeded (6+6)");

  // ─── A few sessions ───
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(18, 0, 0, 0);
    await prisma.classSession.create({
      data: {
        classId: class1.id,
        scheduledDate: d,
        status: i === 0 ? SessionStatus.LIVE : SessionStatus.SCHEDULED,
      },
    });
    const d2 = new Date();
    d2.setDate(d2.getDate() + i);
    d2.setHours(17, 0, 0, 0);
    await prisma.classSession.create({
      data: {
        classId: class2.id,
        scheduledDate: d2,
        status: SessionStatus.SCHEDULED,
      },
    });
  }
  console.log("✓ 8 sessions seeded");

  // ─── Sample invoices in different states ───
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  let seq = 0;
  for (const s of students.slice(0, 6)) {
    seq++;
    const subtotal = 250;
    const vat = +(subtotal * 0.15).toFixed(2);
    const total = +(subtotal + vat).toFixed(2);
    await prisma.invoice.create({
      data: {
        invoiceNumber: `HAJR-${year}-${String(seq).padStart(6, "0")}`,
        studentId: s.studentProfile!.id,
        packageType: PackageType.ESSENTIAL,
        month, year,
        subtotalSar: subtotal as any,
        vatSar: vat as any,
        totalSar: total as any,
        status: seq <= 2 ? PaymentStatus.PAID : seq <= 4 ? PaymentStatus.PENDING : PaymentStatus.OVERDUE,
        dueDate: new Date(year, month - 1, 15),
        paidAt: seq <= 2 ? new Date() : null,
        paymentMethod: seq <= 2 ? PaymentMethod.MADA : null,
      },
    });
  }
  console.log("✓ 6 invoices seeded (mix of PAID/PENDING/OVERDUE)");

  console.log("\n✅ Seed complete! Default password for all seeded users: Hajr@2026");
  console.log("   superadmin@hajracademy.com / admin@hajracademy.com / abdullah.t@hajracademy.com / ali.s@example.com / abu.ali@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());

/**
 * Terms & Conditions — the agreement a buyer accepts at checkout.
 *
 * Kept as structured sections rather than one blob so the page renders real
 * headings and a customer (or a regulator) can point at a clause number.
 *
 * NOT LEGAL ADVICE. This is a careful, conventional set of terms for a Saudi
 * online education seller, written to match how this platform actually
 * behaves — the refund window, the VAT treatment, the recording policy and
 * the delivery promise all reflect the real system. It should still be read
 * by a Saudi lawyer before it is relied on in a dispute.
 */

export interface PolicySection {
  heading: string;
  paragraphs: string[];
}

export function getTerms(isAr: boolean, vatRegistered = false): {
  title: string;
  intro: string;
  sections: PolicySection[];
} {
  if (isAr) {
    return {
      title: "الشروط والأحكام",
      intro:
        "تحكم هذه الشروط استخدامك لموقع أكاديمية هجر ومنصتها التعليمية وشراءك لأي من برامجها. باستخدام الموقع أو إتمام عملية شراء فإنك تقرّ بأنك قرأت هذه الشروط ووافقت عليها. إن لم توافق عليها فيرجى عدم استخدام المنصة.",
      sections: [
        {
          heading: "١) تعريفات",
          paragraphs: [
            "«الأكاديمية» أو «نحن»: الكيان النظامي المذكور في خانة الهوية النظامية أسفل هذه الصفحة.",
            "«المنصة»: موقع hajracademy.com وكل ما يتفرع عنه من صفحات وحسابات وأدوات تعليمية.",
            "«المستخدم» أو «أنت»: كل من ينشئ حساباً أو يشتري برنامجاً أو يستخدم المنصة.",
            "«ولي الأمر»: من يتولى الشراء أو الموافقة نيابة عن طالب دون سن الثامنة عشرة.",
            "«البرنامج»: أي باقة أو دورة أو حصة فردية معروضة للبيع على المنصة.",
          ],
        },
        {
          heading: "٢) الأهلية والحسابات",
          paragraphs: [
            "يجب أن يكون المشتري بالغاً سن الرشد النظامي. يجوز تسجيل الطلاب القاصرين بمعرفة ولي أمرهم، ويتحمل ولي الأمر كامل المسؤولية عن الشراء وعن التزام الطالب بهذه الشروط.",
            "الحساب شخصي وغير قابل للنقل أو المشاركة. أنت مسؤول عن سرية بيانات دخولك وعن كل نشاط يقع من خلال حسابك، وعليك إبلاغنا فوراً عند الاشتباه في أي استخدام غير مصرح به.",
            "تلتزم بتقديم بيانات صحيحة وكاملة عند التسجيل وتحديثها عند تغيرها. يحق لنا تعليق أو إغلاق أي حساب يقدم بيانات غير صحيحة أو يُستخدم بالمخالفة لهذه الشروط.",
          ],
        },
        {
          heading: "٣) البرامج والحصص",
          paragraphs: [
            "الحصص تُقدَّم مباشرة عبر الإنترنت في مواعيد يتم الاتفاق عليها أو جدولتها من قبل الأكاديمية، وتُرافقها أدوات المنصة من واجبات وتمارين ومتابعة.",
            "قد تُعدَّل مواعيد الحصص أو المعلّم المكلّف بها لأسباب تشغيلية، وسنُشعرك بأي تعديل في وقت مناسب. الحصة التي تُلغى من طرف الأكاديمية تُعوَّض بحصة بديلة.",
            "غياب الطالب دون إشعار مسبق وفق المهلة المعلنة لا يُلزم الأكاديمية بتعويض الحصة.",
            "لا تقدّم الأكاديمية أي ضمان بتحقيق درجة معيّنة في أي اختبار خارجي (مثل STEP أو IELTS أو TOEFL)، وتقتصر التزاماتنا على تقديم التحضير والتدريب الموصوف في البرنامج.",
          ],
        },
        {
          heading: "٤) الأسعار والدفع والضريبة",
          paragraphs: [
            vatRegistered
              ? "الأسعار المعروضة على المنصة بالريال السعودي وشاملة لضريبة القيمة المضافة بنسبة 15% ما لم يُذكر خلاف ذلك صراحة."
              : "الأسعار المعروضة على المنصة بالريال السعودي وهي المبالغ النهائية المستحقة. الأكاديمية غير مسجّلة حالياً في ضريبة القيمة المضافة، ولا تُحصَّل أي ضريبة على المبيعات. وعند بلوغ حد التسجيل الإلزامي سيتم التسجيل وتعديل الأسعار أو إضافة الضريبة مع إشعار مسبق.",
            "يتم الدفع إلكترونياً عبر بوابة دفع معتمدة. لا تحتفظ الأكاديمية ببيانات بطاقتك؛ تُعالَج البيانات لدى مزوّد خدمة الدفع وفق معاييره الأمنية.",
            vatRegistered
              ? "تُصدر فاتورة ضريبية إلكترونية لكل عملية شراء وتُرسل إلى بريدك الإلكتروني المسجّل."
              : "تُصدر فاتورة إلكترونية لكل عملية شراء وتُرسل إلى بريدك الإلكتروني المسجّل.",
            "أسعار العروض والحملات سارية خلال المدة المعلنة فقط، ولا تُطبَّق بأثر رجعي على عمليات شراء سابقة.",
            "لا يبدأ تقديم الخدمة إلا بعد تأكيد الدفع من بوابة الدفع.",
          ],
        },
        {
          heading: "٥) الإلغاء والاسترجاع",
          paragraphs: [
            "تخضع طلبات الإلغاء والاسترجاع لسياسة الاسترجاع المنشورة على المنصة، وتُعد جزءاً لا يتجزأ من هذه الشروط.",
            "يُحتسب أي مبلغ مسترد بعد خصم قيمة الحصص التي حضرها الطالب فعلياً وأي رسوم تحويل غير قابلة للاسترداد.",
            "تُعاد المبالغ إلى وسيلة الدفع نفسها التي تم الشراء بها، وقد تستغرق مدة معالجة البنك.",
          ],
        },
        {
          heading: "٦) سلوك المستخدم",
          paragraphs: [
            "تلتزم باحترام المعلّمين وزملائك الطلاب، وبعدم إتيان أي سلوك مسيء أو تمييزي أو مخل بالآداب داخل الحصص أو أدوات التواصل في المنصة.",
            "يُمنع منعاً باتاً تسجيل الحصص أو تصويرها أو بثّها أو إعادة نشرها بأي وسيلة دون إذن كتابي مسبق من الأكاديمية.",
            "يُمنع استخدام المنصة لأي غرض غير نظامي أو لمحاولة اختراقها أو تعطيلها أو الوصول غير المصرح به إلى بيانات الآخرين.",
            "مخالفة هذا البند تخوّل الأكاديمية إيقاف الخدمة فوراً دون استرداد، مع حفظ حقها في المطالبة النظامية.",
          ],
        },
        {
          heading: "٧) الملكية الفكرية",
          paragraphs: [
            "جميع المواد التعليمية والتمارين والاختبارات والتسجيلات والعلامة التجارية وتصميم المنصة مملوكة للأكاديمية أو مرخّصة لها، ومحمية بأنظمة حماية حقوق المؤلف في المملكة العربية السعودية.",
            "يُمنح المستخدم ترخيصاً شخصياً غير حصري وغير قابل للتنازل لاستخدام المواد لأغراض دراسته فقط طوال مدة اشتراكه.",
            "يُمنع نسخ المواد أو توزيعها أو بيعها أو استخدامها تجارياً أو تدريسها للغير بأي صورة.",
          ],
        },
        {
          heading: "٨) الخصوصية وحماية البيانات",
          paragraphs: [
            "تُعالَج بياناتك الشخصية وفق سياسة الخصوصية المنشورة على المنصة وبما يتوافق مع نظام حماية البيانات الشخصية في المملكة العربية السعودية.",
            "قد تُسجَّل بعض الحصص لأغراض الجودة والمراجعة التعليمية، ويُبلَّغ المشاركون بذلك. لك حق طلب الاطلاع على بياناتك أو تصحيحها أو حذفها ضمن ما تسمح به الأنظمة.",
          ],
        },
        {
          heading: "٩) التواصل والإشعارات",
          paragraphs: [
            "بتسجيلك توافق على تلقي الرسائل التشغيلية المتعلقة بحسابك ومشترياتك وحصصك عبر البريد الإلكتروني أو الرسائل النصية أو واتساب.",
            "يمكنك إيقاف الرسائل التسويقية في أي وقت، مع استمرار الرسائل التشغيلية الضرورية لتقديم الخدمة.",
          ],
        },
        {
          heading: "١٠) توفر الخدمة",
          paragraphs: [
            "نبذل جهداً معقولاً لإتاحة المنصة بصورة مستمرة، دون ضمان خلوّها من الانقطاع أو الأخطاء.",
            "قد نوقف الخدمة مؤقتاً لأعمال الصيانة أو التطوير أو لأسباب خارجة عن إرادتنا، وسنسعى للإشعار المسبق متى أمكن.",
            "أنت مسؤول عن توفير اتصال إنترنت وجهاز مناسبين لحضور الحصص.",
          ],
        },
        {
          heading: "١١) حدود المسؤولية",
          paragraphs: [
            "تُقدَّم الخدمة بحالتها الراهنة. لا تتحمل الأكاديمية المسؤولية عن أي أضرار غير مباشرة أو تبعية أو فوات ربح أو فرصة.",
            "لا تتجاوز المسؤولية الإجمالية للأكاديمية — في جميع الأحوال — قيمة المبلغ الذي دفعه المستخدم فعلياً عن البرنامج محل النزاع خلال الاثني عشر شهراً السابقة للمطالبة.",
            "لا يُقصد بهذا البند استبعاد أي مسؤولية لا يجوز استبعادها نظاماً.",
          ],
        },
        {
          heading: "١٢) تعديل الشروط",
          paragraphs: [
            "يحق للأكاديمية تحديث هذه الشروط، ويُنشر التاريخ المعدَّل أعلى الصفحة. التعديلات لا تسري بأثر رجعي على عمليات شراء تمّت قبلها.",
            "استمرارك في استخدام المنصة بعد نشر التحديث يُعدّ قبولاً به.",
          ],
        },
        {
          heading: "١٣) النظام الواجب التطبيق وتسوية المنازعات",
          paragraphs: [
            "تخضع هذه الشروط وتُفسَّر وفقاً لأنظمة المملكة العربية السعودية، بما فيها نظام التجارة الإلكترونية ولائحته التنفيذية.",
            "نسعى لتسوية أي خلاف ودياً خلال ثلاثين يوماً من تاريخ الإشعار الكتابي. وإذا تعذّر ذلك يكون الاختصاص للجهة القضائية المختصة في المملكة العربية السعودية.",
            "في حال وجود اختلاف بين النسختين العربية والإنجليزية من هذه الشروط، تكون النسخة العربية هي المعتمدة.",
          ],
        },
        {
          heading: "١٤) التواصل معنا",
          paragraphs: [
            "لأي استفسار أو شكوى تتعلق بهذه الشروط يمكنك التواصل معنا عبر بيانات الاتصال المذكورة أسفل هذه الصفحة، وسنردّ خلال مدة معقولة.",
          ],
        },
      ],
    };
  }

  return {
    title: "Terms & Conditions",
    intro:
      "These terms govern your use of the HAJR Academy website and learning platform and your purchase of any of its programmes. By using the site or completing a purchase you confirm that you have read and accepted these terms. If you do not accept them, please do not use the platform.",
    sections: [
      {
        heading: "1) Definitions",
        paragraphs: [
          "“the Academy”, “we”: the legal entity identified in the legal-identity block at the foot of this page.",
          "“the Platform”: hajracademy.com together with its pages, accounts and learning tools.",
          "“User”, “you”: anyone who creates an account, buys a programme, or uses the Platform.",
          "“Guardian”: the person purchasing or consenting on behalf of a student under 18.",
          "“Programme”: any plan, course or private class offered for sale on the Platform.",
        ],
      },
      {
        heading: "2) Eligibility and accounts",
        paragraphs: [
          "The purchaser must be of legal age. Minors may be enrolled by a guardian, who accepts full responsibility for the purchase and for the student's compliance with these terms.",
          "Accounts are personal and may not be shared or transferred. You are responsible for keeping your credentials confidential and for all activity under your account, and must notify us promptly of any suspected unauthorised use.",
          "You agree to provide accurate, complete information and keep it current. We may suspend or close any account that provides false information or is used in breach of these terms.",
        ],
      },
      {
        heading: "3) Programmes and classes",
        paragraphs: [
          "Classes are delivered live online at times agreed with, or scheduled by, the Academy, supported by the Platform's homework, practice and progress tools.",
          "Class times or the assigned teacher may change for operational reasons; we will give reasonable notice. A class cancelled by the Academy will be rescheduled.",
          "A student who is absent without notice within the published window is not entitled to a replacement class.",
          "The Academy gives no guarantee of any particular score in an external examination (such as STEP, IELTS or TOEFL). Our obligation is limited to delivering the preparation and instruction described in the programme.",
        ],
      },
      {
        heading: "4) Prices, payment and VAT",
        paragraphs: [
          vatRegistered
            ? "Prices are shown in Saudi Riyals and include 15% Value Added Tax unless expressly stated otherwise."
            : "Prices are shown in Saudi Riyals and are the final amounts payable. The Academy is not currently registered for Value Added Tax and collects no VAT on sales. Should the mandatory registration threshold be reached, we will register and adjust prices or add VAT with prior notice.",
          "Payment is taken online through a licensed payment gateway. The Academy does not store your card details; they are processed by the payment provider under its own security standards.",
          vatRegistered
            ? "An electronic tax invoice is issued for every purchase and sent to your registered email address."
            : "An electronic invoice is issued for every purchase and sent to your registered email address.",
          "Promotional prices apply only for the published period and are not applied retrospectively to earlier purchases.",
          "Service delivery begins only after payment is confirmed by the gateway.",
        ],
      },
      {
        heading: "5) Cancellation and refunds",
        paragraphs: [
          "Cancellations and refunds are governed by the Refund Policy published on the Platform, which forms part of these terms.",
          "Any refund is calculated after deducting the value of classes actually attended and any non-refundable transfer fees.",
          "Refunds are returned to the original payment method and may be subject to the bank's processing time.",
        ],
      },
      {
        heading: "6) User conduct",
        paragraphs: [
          "You agree to treat teachers and fellow students with respect, and not to engage in abusive, discriminatory or indecent behaviour in classes or in the Platform's communication tools.",
          "Recording, filming, broadcasting or republishing classes by any means without the Academy's prior written permission is strictly prohibited.",
          "The Platform may not be used for any unlawful purpose, nor to attempt to breach, disrupt, or gain unauthorised access to other users' data.",
          "Breach of this clause entitles the Academy to suspend service immediately without refund, without prejudice to its legal remedies.",
        ],
      },
      {
        heading: "7) Intellectual property",
        paragraphs: [
          "All teaching materials, exercises, assessments, recordings, branding and platform design are owned by or licensed to the Academy and protected under the copyright laws of the Kingdom of Saudi Arabia.",
          "You are granted a personal, non-exclusive, non-transferable licence to use the materials for your own study for the duration of your subscription.",
          "Copying, distributing, selling, commercially exploiting or teaching the materials to others is prohibited.",
        ],
      },
      {
        heading: "8) Privacy and data protection",
        paragraphs: [
          "Your personal data is processed in line with the Privacy Policy published on the Platform and with the Personal Data Protection Law of the Kingdom of Saudi Arabia.",
          "Some classes may be recorded for quality and educational review; participants are informed. You may request access to, correction of, or deletion of your data as the law permits.",
        ],
      },
      {
        heading: "9) Communications and notices",
        paragraphs: [
          "By registering you agree to receive operational messages about your account, purchases and classes by email, SMS or WhatsApp.",
          "You may opt out of marketing messages at any time; operational messages necessary to deliver the service will continue.",
        ],
      },
      {
        heading: "10) Availability",
        paragraphs: [
          "We make reasonable efforts to keep the Platform available, without warranting that it will be uninterrupted or error-free.",
          "Service may be suspended temporarily for maintenance, development, or reasons beyond our control; we will give advance notice where practicable.",
          "You are responsible for a suitable internet connection and device for attending classes.",
        ],
      },
      {
        heading: "11) Limitation of liability",
        paragraphs: [
          "The service is provided on an “as is” basis. The Academy is not liable for indirect or consequential loss, or for loss of profit or opportunity.",
          "The Academy's total liability shall not in any circumstances exceed the amount actually paid by the user for the programme in dispute in the twelve months preceding the claim.",
          "Nothing in this clause is intended to exclude liability that cannot be excluded by law.",
        ],
      },
      {
        heading: "12) Changes to these terms",
        paragraphs: [
          "The Academy may update these terms; the revised date is published at the top of this page. Changes do not apply retrospectively to purchases already made.",
          "Continuing to use the Platform after an update is published constitutes acceptance of it.",
        ],
      },
      {
        heading: "13) Governing law and disputes",
        paragraphs: [
          "These terms are governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia, including the E-Commerce Law and its Implementing Regulations.",
          "We will seek to resolve any dispute amicably within thirty days of written notice. Failing that, the competent courts of the Kingdom of Saudi Arabia shall have jurisdiction.",
          "In the event of any discrepancy between the Arabic and English versions of these terms, the Arabic version prevails.",
        ],
      },
      {
        heading: "14) Contact us",
        paragraphs: [
          "For any question or complaint about these terms, please contact us using the details in the legal-identity block at the foot of this page. We will respond within a reasonable time.",
        ],
      },
    ],
  };
}

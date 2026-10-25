// ---------------------------------------------------------------------------
// The booking platforms of the Channels page (design App_Channels, version
// 80): the 77 platforms Channex connects to, the 8 recommended for Egypt, and
// each platform's connection guide (what to check first, the steps on the
// platform, where to find the ID, the fields, a note). The guides are word for
// word from the design, which took them from Channex's channel mapping guides.
//
// How a platform connects (`how`):
//   account  one approval on the platform (Airbnb)
//   login    the platform login, entered in our sign-in window (VRBO)
//   ext      steps on the platform's own extranet, then the property ID
//   sup      the broker asks the platform's support with a ready message
//   request  we turn it on (Google)
//   unk      no guide yet: same as sup, for the whole account
//   na       doesn't accept apartments (Hopper, Nuitee)
// ext and sup connect property by property; the others once per company.
//
// Brokers never see the name Channex. The only exception is the value they
// search for on the platform itself: the guide pictures and the ready message
// name "Channex.io".
// ---------------------------------------------------------------------------

import type { Lang } from "./i18n.ts";

export type How =
  | "account"
  | "login"
  | "ext"
  | "sup"
  | "request"
  | "unk"
  | "na";

export type Platform = {
  id: string;
  name: string;
  color: string;
  how: How;
  rec: boolean;
};

export type GuideField = {
  id: string;
  label: string;
  ph: string;
  type: string;
};

export type Guide = {
  t: Exclude<How, "account">;
  wait?: boolean;
  req?: string[];
  steps?: string[];
  idWhere?: string | null;
  fields?: GuideField[];
  note?: string | null;
  why?: string;
  contract?: boolean;
  email?: string | null;
};

export type Picture = {
  path: string[];
  kind: "search" | "select" | "toggle";
  label?: string;
  value?: string;
  rows?: [string, string][];
  btn: string;
  m1: string;
  m2: string;
};

// [contract needed, extra fields, note, support email, "code" | "nopid"]
type SupRow = [
  number,
  (GuideField[] | null)?,
  (string | null)?,
  (string | null)?,
  string?,
];

// The partner's name as brokers type it on the platform.
export const PARTNER_NAME = "Channex.io";
const PN = PARTNER_NAME;

// [id, name, tile colour, how] in the design's order.
const REC: [string, string, string][] = [
  ["abb", "Airbnb", "#FF5A5F"],
  ["bdc", "Booking.com", "#003580"],
  ["hw", "Hostelworld", "#F25621"],
  ["exp", "Expedia", "#1E243A"],
  ["ago", "Agoda", "#5B2D90"],
  ["goo", "Google Hotels & Vacation Rentals", "#1A73E8"],
  ["vrbo", "VRBO", "#245ABC"],
  ["trip", "Trip.com", "#287DFA"],
];

const MORE = [
  "Ascend Travel",
  "Bed-and-Breakfast.it",
  "Bookeasy",
  "Check24",
  "Crewdogs",
  "Ctoutvert / Secureholiday",
  "Despegar",
  "Didatravel",
  "eDreams",
  "Emerging Travel Group",
  "feratel",
  "Getaroom",
  "Glamping Hub",
  "HeyTrip",
  "Hipcamp",
  "Hookusbookus",
  "Hopper",
  "Hopper Homes",
  "Hostelhop",
  "Hotel Tonight",
  "Hotel Trader",
  "Hotelbeds",
  "Hotelnetwork",
  "HotelREZ",
  "HotelSpecials",
  "Hotely.cz",
  "Hoterip",
  "HRS",
  "HRS Australia",
  "Hyperguest",
  "Inntopia",
  "Kizan Tourism",
  "KliknBook",
  "Klook",
  "LocalOTA",
  "MakeMyTrip",
  "MG Bedbank",
  "Ministry of Villas",
  "Mitchell Corp",
  "Moverii",
  "Mr & Mrs Smith",
  "Noclegi.pl",
  "Nocowanie.pl",
  "Nuitee",
  "OpenGDS.com",
  "OutReserve",
  "Pitchup",
  "PriceTravel",
  "Ratedock",
  "Reconline",
  "Resonline",
  "RevNGo.com",
  "Roibos",
  "Roombeast",
  "Spot2nite",
  "Szallas",
  "Tablet Michelin",
  "TBO Holidays",
  "Tiket",
  "TravelgateX",
  "Travelminit",
  "Traveloka",
  "Travia",
  "VacanceSelect",
  "Waverick",
  "WebBeds",
  "Wink",
  "World2Meet (W2M)",
  "Yatra",
];

// A stable id for the platforms after the first 8: the name in lower case,
// letters and digits only ("Mr & Mrs Smith" -> "mrmrssmith").
export const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

type Built = {
  GD: Record<string, Guide>;
  SUP: Record<string, SupRow>;
  PIC: Record<string, Picture>;
  guideFor: (name: string) => Guide;
  supSteps: (name: string, g: { contract?: boolean }) => string[];
};

function build(lang: Lang): Built {
  const T = (a: string, e: string) => (lang === "ar" ? a : e);
  const fill = (s: string, o: Record<string, string>) =>
    String(s).replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const F = (
    id: string,
    a: string,
    e: string,
    ph?: string,
    type?: string,
  ): GuideField => ({ id, label: T(a, e), ph: ph || "", type: type || "text" });
  const PID = (p: string) =>
    F("pid", "رقم العقار على " + p, "Property ID on " + p, "9123456");
  const NOCM = T(
    "غير مربوط بنظام إدارة قنوات آخر",
    "It isn’t connected to another channel manager",
  );
  const GD: Record<string, Guide> = {
    "Booking.com": {
      t: "ext",
      wait: true,
      req: [
        T(
          "العقار مفتوح ومتاح للحجز على Booking.com",
          "The property is open and bookable on Booking.com",
        ),
        T("لديه سعر واحد على الأقل", "It has at least one rate plan"),
        NOCM,
      ],
      steps: [
        T(
          "سجّل الدخول إلى حساب Booking.com لعقارك، وجهّز هاتفك لرمز التحقق.",
          "Log in to your property’s Booking.com extranet (account.booking.com). Keep your phone ready for the passcode.",
        ),
        T(
          "افتح الحساب ← مزوّد الاتصال، واضغط بحث.",
          "Open Account › Connectivity provider and press Search.",
        ),
        T(
          "اكتب اسم شريك الربط كاملاً كما في الصورة (جزء من الاسم لا يُظهره)، واختره ثم اضغط التالي.",
          "Type our connection partner’s full name exactly as in the picture (part of the name won’t find it), pick it, then press Next.",
        ),
        T(
          "ضع علامة على اتفاقية الخدمة واضغط «نعم، أوافق».",
          "Tick the service agreement and press “Yes, I accept”.",
        ),
        T(
          "يظهر الربط «بانتظار القبول» حتى يقبله شريك الربط. نخبرك عندما يصبح متصلاً.",
          "The connection shows as waiting until our connection partner accepts it. We tell you when it’s connected.",
        ),
      ],
      idWhere: T(
        "رقم العقار يظهر أعلى الصفحة بجانب اسم العقار.",
        "Your property ID is at the top of the extranet, next to the property name.",
      ),
      fields: [PID("Booking.com")],
      note: T(
        "بعد الربط قد يغيّر Booking.com إعدادات الأسعار المشتقة وأقل مدة إقامة. راجعها مرة واحدة.",
        "After connecting, Booking.com may change derived rates and min stay settings. Check them once.",
      ),
    },
    Expedia: {
      t: "ext",
      req: [
        T("عقارك منشور على Expedia", "Your property is live on Expedia"),
        NOCM,
      ],
      steps: [
        T(
          "سجّل الدخول إلى بوابة شركاء Expedia وأكمل التحقق بخطوتين.",
          "Log in to Expedia Partner Central and complete two-factor authentication.",
        ),
        T(
          "افتح الغرف والأسعار ← إعدادات الربط.",
          "Open Rooms and Rates › Connectivity Settings.",
        ),
        T(
          "تحت «مزوّد النظام» اختر شريك الربط الخاص بنا، وضع علامة على «الأسعار والإتاحة» و«استلام الحجوزات»، ثم اضغط إرسال.",
          "Under System Provider, pick our connection partner, tick Availability & Rates and Booking retrieval, then press Submit.",
        ),
      ],
      fields: [PID("Expedia")],
    },
    Agoda: {
      t: "ext",
      req: [
        T("لديك عقد مباشر مع Agoda", "You have a direct contract with Agoda"),
        T(
          "بيانات العقار وصوره مرفوعة على Agoda",
          "Your property details and photos are uploaded on Agoda",
        ),
      ],
      steps: [
        T(
          "في بوابة Agoda للعقارات افتح الإعدادات ← إعدادات العقار ← إعدادات اختيارية.",
          "In Agoda YCS, open Settings › Property Settings › Optional Settings.",
        ),
        T(
          "فعّل «وضع مدير القنوات» واختر شريك الربط الخاص بنا من القائمة، ثم احفظ.",
          "Turn on “channel manager mode”, pick our connection partner from the list, then Save.",
        ),
        T(
          "أو راسل دعم Agoda من البوابة واطلب ربط العقار بشريك الربط الخاص بنا.",
          "Or message Agoda support from the extranet and ask them to connect the property to our connection partner.",
        ),
      ],
      fields: [F("pid", "رقم الفندق على Agoda", "Agoda Hotel ID", "123456")],
    },
    "Trip.com": {
      t: "ext",
      req: [
        T(
          "لديك حساب على بوابة Trip.com للعقارات",
          "You have a Trip.com eBooking account",
        ),
      ],
      steps: [
        T(
          "سجّل الدخول إلى بوابة Trip.com للعقارات.",
          "Log in to Trip.com eBooking.",
        ),
        T(
          "افتح الأسعار والإتاحة ← إعدادات الربط.",
          "Open Rates & Availability › Connectivity Settings.",
        ),
        T(
          "ابحث عن شريك الربط الخاص بنا، اضغط متابعة ثم ربط.",
          "Search for our connection partner, press Continue, then Connect.",
        ),
      ],
      fields: [
        F("pid", "رقم الفندق على Trip.com", "Trip.com Hotel ID", "123456"),
      ],
      note: T(
        "إذا لم تظهر هذه الخيارات، راسل lodgingsupport@trip.com.",
        "If you don’t see these options, email lodgingsupport@trip.com.",
      ),
    },
    VRBO: {
      t: "login",
      req: [
        T(
          "إذا كان حسابك مربوطاً بنظام آخر، اطلب من دعم VRBO إعادته حساباً عادياً",
          "If your account is connected to another system, ask VRBO support to turn it back into a normal account",
        ),
        T(
          "احذف روابط التقويم الخارجية من إعلاناتك",
          "Remove all iCal calendar links from your listings",
        ),
        T(
          "جهّز هاتف مالك الحساب لرمز التحقق",
          "Keep the account owner’s phone ready for the SMS code",
        ),
      ],
      steps: [
        T(
          "اضغط «تسجيل الدخول إلى VRBO» لتفتح نافذة الدخول.",
          "Press “Sign in to VRBO” to open the sign-in window.",
        ),
        T(
          "أدخل بريد وكلمة مرور حساب VRBO واضغط «متابعة». نحاول الدخول فيرسل VRBO رمزاً برسالة نصية لهاتف مالك الحساب.",
          "Enter your VRBO email and password and press Continue. We try to sign in, so VRBO texts a code to the account owner’s phone.",
        ),
        T(
          "أدخل الرمز في نفس النافذة واضغط «اربط».",
          "Enter the code in the same window and press Connect.",
        ),
      ],
      fields: [],
      note: T(
        "عملة حسابك على VRBO يجب أن تكون من: الدولار الأمريكي أو الكندي أو الأسترالي أو النيوزيلندي أو السنغافوري، اليورو، الين، الريال البرازيلي، البيزو المكسيكي، الجنيه الإسترليني. تغيير كلمة المرور لاحقاً يوقف الربط وستحتاج لإعادة الربط. الرسائل والتقييمات غير مدعومة.",
        "Your VRBO currency must be one of USD, CAD, EUR, AUD, NZD, JPY, SGD, BRL, MXN or GBP. Changing your VRBO password later stops the connection and you’ll need to reconnect. Messages and reviews aren’t supported.",
      ),
    },
    Hostelworld: {
      t: "sup",
      idWhere: T(
        "رقم عقارك على Hostelworld ظاهر بالفعل: أعلى صفحة Hostelworld Inbox بجانب اسم العقار، وفي أي بريد تأكيد حجز. إن كان لديك، أدخله الآن.",
        "Your Hostelworld property ID is already shown: at the top of Hostelworld Inbox next to the property name, and in every booking confirmation email. If you have it, enter it now.",
      ),
      fields: [PID("Hostelworld")],
      note: T(
        "على Hostelworld لا تُطبّق قواعد يوم الوصول والمغادرة، والغرف الخاصة تُسعّر بكامل سعتها.",
        "On Hostelworld, arrival and departure day rules don’t apply, and private rooms are priced at full occupancy.",
      ),
    },
    "Google Hotels & Vacation Rentals": {
      t: "request",
      req: [
        T("عنوان كامل وموقع على الخريطة", "A full address and map location"),
        T("رقم هاتف وسياسات العقار", "A phone number and property policies"),
        T(
          "8 صور على الأقل، وعدد غرف النوم والحمامات والأسرّة",
          "At least 8 photos, plus bedroom, bathroom and bed counts",
        ),
        T(
          "رابط موقع يبدأ بـ https، ووصف للعقار، وسياسة إلغاء، ومرفق واحد على الأقل",
          "A website link starting with https, a property description, a cancellation policy and at least one amenity",
        ),
      ],
      steps: [
        T(
          "لا شيء تفعله على Google، فلا توجد بوابة للعقارات.",
          "Nothing to do on Google: it has no extranet.",
        ),
        T(
          "تأكد أن اسم العقار وعنوانه وهاتفه دقيقة، فـ Google يطابق العقار بها.",
          "Make sure the property name, address and phone are accurate, since Google matches on them.",
        ),
        T(
          "اضغط «اطلب التفعيل» ونفعّله نحن.",
          "Press “Request it” and we turn it on.",
        ),
      ],
      note: T(
        "قد يستغرق ظهور العقار على Google 4 أسابيع أو أكثر. كل شقة تُربط على حدة.",
        "It can take 4 weeks or more to appear on Google. Each apartment connects on its own.",
      ),
    },
    Despegar: {
      t: "ext",
      req: [NOCM],
      steps: [
        T(
          "في بوابة Despegar افتح الإعدادات العامة ← ربط مدير القنوات.",
          "In the Despegar extranet, open General Settings › Channel Manager Connection.",
        ),
        T(
          "احذف أي ربط سابق بمدير قنوات آخر.",
          "Remove any old channel manager connections.",
        ),
        T(
          "اضغط «إضافة مدير قنوات»، واختر شريك الربط الخاص بنا ووافق على الشروط.",
          "Press “Add channel manager / PMS”, pick our connection partner and accept the terms.",
        ),
        T(
          "انسخ اسم المستخدم ورقم العقار وكلمة مرور الربط. كلمة المرور تظهر مرة واحدة فقط.",
          "Copy the username, property ID and API password. The password is shown only once.",
        ),
      ],
      fields: [
        F("u", "اسم المستخدم", "Username", ""),
        PID("Despegar"),
        F("pw", "كلمة مرور الربط", "API password", "", "password"),
      ],
      note: T(
        "استخدم كلمة مرور الربط وليس كلمة مرور الدخول. إذا فقدتها أعد إنشاء الربط.",
        "Use the API password, not your normal login password. If you lose it, reset the connection.",
      ),
    },
    "MG Bedbank": {
      t: "ext",
      steps: [
        T(
          "في بوابة MG افتح قسم مدير القنوات واختر شريك الربط الخاص بنا.",
          "In the MG extranet, open the channel manager section and pick our connection partner.",
        ),
        T(
          "إذا لم تجده، راسل دعم MG واطلب تفعيل الربط.",
          "If you can’t find it, email MG support and ask them to turn on the connection.",
        ),
      ],
      fields: [
        F("pid", "رقم الفندق على MG Bedbank", "MG Bedbank Hotel ID", "123456"),
      ],
    },
    Traveloka: {
      t: "ext",
      steps: [
        T(
          "في بوابة Traveloka افتح قسم مدير القنوات واختر شريك الربط الخاص بنا.",
          "In the Traveloka extranet, open the channel manager section and pick our connection partner.",
        ),
        T(
          "انسخ رقم عقارك على Traveloka. قد يختلف عن رقمك المعتاد ويحتوي حروفاً.",
          "Copy your Traveloka property ID. It may differ from your usual ID and contain letters.",
        ),
        T(
          "لم تجد القسم؟ اضغط «تحتاج مساعدة؟» ويربطه فريقنا مع شريك الربط.",
          "Can’t find the section? Press “Need help?” and our team connects it with our connection partner.",
        ),
      ],
      fields: [PID("Traveloka")],
    },
    Hotelbeds: {
      t: "ext",
      req: [
        NOCM,
        T(
          "تواريخ عقدك تمتد سنتين على الأقل، مع أسعار محمّلة لكل غرفة ولكل يوم",
          "Your contract dates run at least 2 years ahead, with prices loaded for every room and day",
        ),
      ],
      steps: [
        T(
          "في بوابة Hotelbeds اختر شريك الربط الخاص بنا من قائمة مديري القنوات.",
          "In the Hotelbeds extranet, pick our connection partner from the channel manager list.",
        ),
        T(
          "إذا لم يظهر، افتح طلب دعم واطلب من Hotelbeds تفعيل الربط لعقارك.",
          "If it isn’t listed, open a support ticket asking Hotelbeds to turn on the connection for your property.",
        ),
        T(
          "أدخل اسم المستخدم وكلمة المرور اللذين يرسلهما Hotelbeds للربط.",
          "Enter the username and password Hotelbeds gives you for the connection.",
        ),
        T(
          "بعد نجاح الفحص اختر العقد الذي تريد ربطه. كل عقد يُربط على حدة.",
          "After the check succeeds, pick which contract to connect. Each contract connects on its own.",
        ),
      ],
      fields: [
        F("u", "اسم المستخدم من Hotelbeds", "Username from Hotelbeds", ""),
        F(
          "pw",
          "كلمة المرور من Hotelbeds",
          "Password from Hotelbeds",
          "",
          "password",
        ),
      ],
      note: T(
        "كل عقد على Hotelbeds يُربط على حدة.",
        "Each Hotelbeds contract connects on its own.",
      ),
    },
    "Hopper Homes": {
      t: "ext",
      steps: [
        T(
          "أنشئ حساب استضافة على Hopper Homes من الرابط الذي نرسله لك.",
          "Sign up for a Hopper Hosting account using the link we send you.",
        ),
        T(
          "افتح رسالة Hopper Homes، اضغط الانضمام وعيّن كلمة مرور.",
          "Open the Hopper Homes email, press Join Hopper Hosting and set a password.",
        ),
        T(
          "عند سؤالك هل تستخدم نظام إدارة عقارات اختر «نعم»، ثم اختر شريك الربط الخاص بنا.",
          "When asked if you’re integrating with a property management system, choose Yes, then pick our connection partner.",
        ),
      ],
      fields: [
        F("name", "اسم المضيف على Hopper", "Host name on Hopper", ""),
        F(
          "u",
          "البريد الذي سجّلت به في Hopper",
          "The email you signed up to Hopper with",
          "name@company.com",
          "email",
        ),
      ],
      note: T(
        "الأسعار بالدولار فقط. إذا حُذف الربط لا يمكن إعادته إلا بحساب وبريد جديدين على Hopper.",
        "USD prices only. If the connection is deleted, reconnecting needs a new Hopper account and email.",
      ),
    },
    Hopper: {
      t: "na",
      why: T(
        "Hopper يقبل الفنادق والمنتجعات فقط، وليس الشقق.",
        "Hopper accepts hotels and resorts only, not apartments.",
      ),
    },
    Nuitee: {
      t: "na",
      why: T(
        "Nuitee لا يقبل الشقق والفيلات.",
        "Nuitee doesn’t accept apartments or villas.",
      ),
    },
  };
  // support-type platforms: [contract needed, extra fields, note, email]
  const SUP: Record<string, SupRow> = {
    Check24: [1],
    Crewdogs: [1],
    Didatravel: [1],
    "Emerging Travel Group": [0],
    feratel: [1],
    Getaroom: [
      0,
      null,
      T(
        "لا تحتاج رقماً مسبقاً: يرسل Getaroom رقم الفندق في رده، ثم حجزاً تجريبياً وإلغاءً قبل أن يصبح العقار مباشراً.",
        "You don’t need an ID first: Getaroom sends the hotel ID in its reply, then a test booking and a cancellation before the property goes live.",
      ),
      "propertyactivation@getaroom.com",
    ],
    "Glamping Hub": [1],
    Hipcamp: [
      0,
      null,
      T(
        "رقم عقارك على Hipcamp موجود في محرر العقار.",
        "Your Hipcamp property ID is in the property editor.",
      ),
      "campgrounds@hipcamp.com",
    ],
    "Hotel Tonight": [
      0,
      null,
      T(
        "جديد على HotelTonight؟ راسل htmarketmanagement@airbnb.com أولاً.",
        "New to HotelTonight? Email htmarketmanagement@airbnb.com first.",
      ),
      "mapping-ht@airbnb.com",
    ],
    "Hotel Trader": [1],
    Hyperguest: [
      0,
      null,
      T(
        "لا تغيّر رموز الغرف أو الأسعار على Hyperguest بعد الربط.",
        "Don’t change room or rate codes on Hyperguest after linking.",
      ),
    ],
    HRS: [
      1,
      null,
      T(
        "استخدم سعراً واحداً لكل نوع غرفة على HRS لتجنب الحجز المزدوج.",
        "Use one rate plan per room type on HRS to avoid double bookings.",
      ),
    ],
    Inntopia: [1],
    KliknBook: [1, null, null, null, "code"],
    Klook: [0],
    MakeMyTrip: [
      1,
      [F("tok", "رمز الربط من MakeMyTrip", "Access token from MakeMyTrip", "")],
    ],
    "Mr & Mrs Smith": [1],
    "OpenGDS.com": [1],
    PriceTravel: [1],
    Roibos: [
      0,
      [
        F("u", "اسم المستخدم من Roibos", "Username from Roibos", ""),
        F(
          "pw",
          "كلمة المرور من Roibos",
          "Password from Roibos",
          "",
          "password",
        ),
      ],
      T(
        "بعد نجاح الفحص اختر العقد الذي تريد ربطه. كل عقد يُربط على حدة.",
        "After the check succeeds, pick which contract to connect. Each contract connects on its own.",
      ),
      null,
      "nopid",
    ],
    Tiket: [0],
    WebBeds: [1, null, null, null, "code"],
    Yatra: [1],
  };
  function guideFor(name: string): Guide {
    if (GD[name]) return GD[name];
    if (SUP[name]) {
      const x = SUP[name];
      const idf =
        x[4] === "nopid"
          ? []
          : x[4] === "code"
            ? [F("pid", "رمز الفندق من " + name, "Hotel code from " + name, "")]
            : [PID(name)];
      return {
        t: "sup",
        contract: !!x[0],
        fields: idf.concat(x[1] || []),
        note: x[2] || null,
        email: x[3] || null,
        idWhere:
          x[4] === "nopid"
            ? null
            : T(
                "رقم الفندق يظهر غالباً في حسابك على المنصة بجانب اسم العقار أو في رسائل الحجوزات. إن كان لديك، أدخله وأرسله مع الرسالة.",
                "The hotel ID is usually shown in your platform account next to the property name, or in booking emails. If you have it, enter it and it’s added to the message.",
              ),
      };
    }
    return { t: "unk" };
  }
  function supSteps(name: string, g: { contract?: boolean }): string[] {
    const st: string[] = [];
    if (g.contract)
      st.push(
        fill(
          T(
            "وقّع عقداً مباشراً مع {p} وارفع بيانات العقار وصوره عندهم.",
            "Sign a direct contract with {p} and upload your property details and photos there.",
          ),
          { p: name },
        ),
      );
    st.push(
      fill(
        T(
          "انسخ الرسالة الجاهزة أدناه وأرسلها لدعم {p}.",
          "Copy the ready message below and send it to {p} support.",
        ),
        { p: name },
      ),
    );
    st.push(
      T(
        "اضغط «أرسلت الرسالة». يظهر العقار «بانتظار المنصة».",
        "Press “I’ve sent the message”. The property shows as waiting for the platform.",
      ),
    );
    st.push(
      fill(
        T(
          "عندما يرد {p} برقم عقارك، افتح «إدارة» وأدخله ثم «تحقق واربط».",
          "When {p} replies with your property ID, open Manage, enter it and press Check and connect.",
        ),
        { p: name },
      ),
    );
    return st;
  }
  // Simplified illustrations of the key screen on each platform (not real screenshots). The partner name appears only here, as brokers will see it on the platform.

  const PIC: Record<string, Picture> = {
    "Booking.com": {
      path: [
        T("الحساب", "Account"),
        T("مزوّد الاتصال", "Connectivity provider"),
      ],
      kind: "search",
      label: T("ابحث عن مزوّد الاتصال", "Search for a connectivity provider"),
      value: PN,
      btn: T("التالي", "Next"),
      m1: "2",
      m2: "3",
    },
    Expedia: {
      path: [
        T("الغرف والأسعار", "Rooms and Rates"),
        T("إعدادات الربط", "Connectivity Settings"),
      ],
      kind: "select",
      rows: [
        [T("مزوّد النظام", "System provider"), PN],
        [
          T("الخدمات", "Services"),
          T(
            "الأسعار والإتاحة + استلام الحجوزات",
            "Availability & Rates + Booking retrieval",
          ),
        ],
      ],
      btn: T("إرسال", "Submit"),
      m1: "2",
      m2: "3",
    },
    Agoda: {
      path: [
        T("الإعدادات", "Settings"),
        T("إعدادات العقار", "Property Settings"),
        T("إعدادات اختيارية", "Optional Settings"),
      ],
      kind: "toggle",
      label: T("وضع مدير القنوات", "Channel manager mode"),
      rows: [[T("مدير القنوات", "Channel manager"), PN]],
      btn: T("حفظ", "Save"),
      m1: "1",
      m2: "2",
    },
    "Trip.com": {
      path: [
        T("الأسعار والإتاحة", "Rates & Availability"),
        T("إعدادات الربط", "Connectivity Settings"),
      ],
      kind: "search",
      label: T("ابحث عن مزوّد الربط", "Search for a connectivity provider"),
      value: PN,
      btn: T("ربط", "Connect"),
      m1: "2",
      m2: "3",
    },
    Despegar: {
      path: [
        T("الإعدادات العامة", "General Settings"),
        T("ربط مدير القنوات", "Channel Manager Connection"),
      ],
      kind: "select",
      rows: [[T("مدير القنوات", "Channel manager"), PN]],
      btn: T("إضافة", "Add"),
      m1: "1",
      m2: "3",
    },
    "MG Bedbank": {
      path: [T("مدير القنوات", "Channel manager")],
      kind: "select",
      rows: [[T("شريك الربط", "Connectivity partner"), PN]],
      btn: T("حفظ", "Save"),
      m1: "1",
      m2: "1",
    },
    Traveloka: {
      path: [T("مدير القنوات", "Channel manager")],
      kind: "select",
      rows: [[T("شريك الربط", "Connectivity partner"), PN]],
      btn: T("حفظ", "Save"),
      m1: "1",
      m2: "1",
    },
    Hotelbeds: {
      path: [T("مدير القنوات", "Channel manager")],
      kind: "select",
      rows: [[T("شريك الربط", "Connectivity partner"), PN]],
      btn: T("حفظ", "Save"),
      m1: "1",
      m2: "1",
    },
  };

  return { GD, SUP, PIC, guideFor, supSteps };
}

const BUILT: Partial<Record<Lang, Built>> = {};
function built(lang: Lang): Built {
  return (BUILT[lang] ??= build(lang));
}

// The how of every platform: its guide type, account for Airbnb.
const howOf = (name: string): How =>
  name === "Airbnb" ? "account" : built("en").guideFor(name).t;

export const PLATFORMS: readonly Platform[] = [
  ...REC.map(([id, name, color]) => ({
    id,
    name,
    color,
    how: howOf(name),
    rec: true,
  })),
  ...MORE.map((name) => ({
    id: slug(name),
    name,
    color: "#4B5563",
    how: howOf(name),
    rec: false,
  })),
];

export const RECOMMENDED = PLATFORMS.filter((p) => p.rec);

export function platformById(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

export function isPlatformId(id: unknown): id is string {
  return typeof id === "string" && PLATFORMS.some((p) => p.id === id);
}

// Property by property (Booking.com, Expedia, Hostelworld...) or once for the
// whole company (Airbnb, VRBO, Google, platforms with no guide).
export function isPropertyLevel(p: Platform): boolean {
  return p.how === "ext" || p.how === "sup";
}

// The tile's letters: "Ag" for Agoda, otherwise the first letter or digit.
export function initials(name: string): string {
  if (name === "Agoda") return "Ag";
  return name
    .replace(/[^A-Za-z0-9]/g, "")
    .charAt(0)
    .toUpperCase();
}

// The guide for a platform in the reader's language. Platforms with no guide
// ask for the property ID the platform's support sends back.
export function guideFor(p: Platform, lang: Lang): Guide {
  const b = built(lang);
  if (p.id === "abb") return { t: "ext", fields: [] };
  const g = { ...b.guideFor(p.name) };
  if (g.t === "unk") g.fields = [pidField(p.name, lang)];
  return g;
}

export function pidField(name: string, lang: Lang): GuideField {
  return {
    id: "pid",
    label: lang === "ar" ? "رقم العقار على " + name : "Property ID on " + name,
    ph: "9123456",
    type: "text",
  };
}

// The numbered steps: the guide's own, or the support steps for sup / unk.
export function guideSteps(p: Platform, g: Guide, lang: Lang): string[] {
  const b = built(lang);
  if (g.t === "sup") return b.supSteps(p.name, g);
  if (g.t === "unk") return b.supSteps(p.name, {});
  return g.steps ?? [];
}

export function pictureFor(p: Platform, lang: Lang): Picture | null {
  return built(lang).PIC[p.name] ?? null;
}

// ---------------------------------------------------------------------------
// Text for the broker Channels page, in Arabic and English, word for word
// from the design (App_Channels, version 80, "Channel connections · ready for
// development"). Counted Arabic phrases follow the design's counting rules
// (1, 2, 3 to 10, 11 and up). The guides themselves are in
// lib/channel-catalog.ts.
//
// Brokers never see the name of our connection partner, except in the ready
// message for support (lib/channel-rules.ts) and the guide pictures.
// ---------------------------------------------------------------------------

import type { Lang } from "./i18n.ts";
import type { How } from "./channel-catalog.ts";
import type { St } from "./channel-rules.ts";

type HowKey = How;

function pla(n: number, one: string, two: string, few: string, many: string) {
  return n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10 ? few : many).replace("{n}", String(n));
}

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const md = (iso: string) => [Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))] as const;

// "Oct 24–28" / "Oct 30 – Nov 2"; Arabic "24–28 أكتوبر" / "30 أكتوبر – 2 نوفمبر".
function rangeEn(from: string, to: string) {
  const [m1, d1] = md(from);
  const [m2, d2] = md(to);
  return m1 === m2 ? `${MONTHS_EN[m1]} ${d1}–${d2}` : `${MONTHS_EN[m1]} ${d1} – ${MONTHS_EN[m2]} ${d2}`;
}
function rangeAr(from: string, to: string) {
  const [m1, d1] = md(from);
  const [m2, d2] = md(to);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS_AR[m1]}` : `${d1} ${MONTHS_AR[m1]} – ${d2} ${MONTHS_AR[m2]}`;
}
const dayEn = (iso: string) => `${MONTHS_EN[md(iso)[0]]} ${md(iso)[1]}`;
const dayAr = (iso: string) => `${md(iso)[1]} ${MONTHS_AR[md(iso)[0]]}`;

const ar = {
  channels: "القنوات",
  intro: "اربط منصات الحجز أولاً، ثم اربط كل شقة بإعلانها على كل منصة. الأسعار والإتاحة والحجوزات تبقى متطابقة في كل مكان.",

  // Bell and notifications
  notifications: "الإشعارات",
  bellLabel: (n: number) => `الإشعارات (${n} غير مقروءة)`,
  markAll: "تحديد الكل كمقروء",
  unread: "غير مقروء",
  noNotifs: "لا جديد. سنخبرك هنا عند أي تغيير في منصاتك.",
  byEmail: "يصلك نفس الإشعار بالبريد للأحداث المهمة: رفض، توقف المزامنة، حجز لغرفة غير مربوطة.",
  byEmailPhone: "الإشعارات المهمة تصلك بالبريد أيضاً.",
  back: "رجوع",

  // Tabs and KPIs
  tabPlat: "المنصات",
  tabLinks: "الشقق والربط",
  kOn: "منصات متصلة",
  kWait: "بانتظار المنصة",
  kAttn: "تحتاج إجراء",
  kLive: "شقق تتزامن على منصة واحدة على الأقل",
  kOnPhone: "متصلة",
  kWaitPhone: "بالانتظار",
  kLivePhone: "تتزامن",
  aOfB: (a: number, b: number) => `${a} من ${b}`,

  // Issues
  issuesTitle: (n: number) => `تحتاج انتباهك (${n})`,
  dismiss: "تجاهل",
  dismissed: "تم إخفاء التنبيه.",

  // Empty, search, filters
  startTitle: "ابدأ بربط أول منصة",
  startBody: "لا تحتاج إعلانات في Omnirent بعد. اربط Airbnb لتسحب إعلاناتك منه، أو اربط أي منصة أخرى برقم العقار.",
  searchPlatforms: "ابحث عن منصة",
  searchPhone: (n: number) => `ابحث في ${n} منصة`,
  filterAll: "الكل",
  filterOn: "متصلة",
  filterWait: "بالانتظار",
  filterOff: "غير متصلة",
  recTitle: "مقترحة لمصر",
  recSub: "الأكثر طلباً للشقق في سوقك",
  allTitle: (n: number) => `كل المنصات (${n})`,
  results: (n: number) => `النتائج (${n})`,
  colPlatform: "المنصة",
  colStatus: "الحالة",
  colLinked: "الشقق المربوطة",
  showAll: (n: number) => `عرض كل المنصات (${n})`,
  noResults: "لا توجد منصات تطابق البحث أو التصفية.",

  // Platform cards
  st: {
    on: "متصل",
    wait: "بانتظار المنصة",
    attn: "يحتاج إجراء",
    off: "غير متصل",
    rej: "رفضت المنصة",
    na: "غير متاح للشقق",
  } as Record<St, string>,
  how: {
    account: "موافقة واحدة على المنصة",
    ext: "خطوات على المنصة + رقم العقار",
    login: "بيانات دخولك على المنصة",
    sup: "تطلب الربط من دعم المنصة",
    request: "نفعّله لك",
    unk: "تطلب الربط من دعم المنصة",
    na: "لا يقبل الشقق",
  } as Record<HowKey, string>,
  countProp: (a: number, c: number) => `العقارات المتصلة: ${a} · الشقق المربوطة: ${c}`,
  countWaiting: (w: number) => ` · بانتظار المنصة: ${w}`,
  countLinked: (n: number) => `الشقق المربوطة: ${n}`,
  samePrice: "نفس سعر Omnirent",
  priceUp: (v: number) => `السعر أعلى بـ ${v}%`,
  priceDown: (v: number) => `السعر أقل بـ ${v}%`,
  btnNa: "غير متاح",
  btnRequest: "اطلب الربط",
  btnConnect: "ربط",
  btnReconnect: "أعد الربط",
  btnTryAgain: "حاول مجدداً",
  btnManage: "إدارة",
  noteAbbAttn: "أُلغي الوصول من Airbnb. أعد الربط لاستئناف المزامنة.",
  noteLoginAttn: (p: string) => `توقف ${p} عن قبول بيانات الدخول (تغيّرت كلمة المرور أو انتهت). أعد الربط بكلمة المرور الجديدة. المزامنة متوقفة.`,
  noteConfirm: (p: string) => `أرسلنا طلب الربط. ننتظر تأكيد ${p} وسنخبرك عند التفعيل.`,
  noteRequest: "طلبنا التفعيل. سنخبرك عند الانتهاء.",
  noteSup: "بانتظار رد دعم المنصة على رسالتك. عندما يصلك الرقم افتح «إدارة» وأدخله.",

  // Links grid
  pullAbb: "اسحب إعلاناتي من Airbnb",
  pullAbbPhone: "اسحب من Airbnb",
  addManual: "إضافة شقة يدوياً",
  confirmAll: (n: number) => `تأكيد كل المقترحات (${n})`,
  suggTxt: (n: number) => `لدينا ${n} من الروابط المقترحة. راجعها أو أكّدها كلها.`,
  bulkActions: "إجراءات جماعية",
  selected: (n: number) => `المحدد: ${apts("ar", n)}`,
  confirmSugg: "تأكيد المقترحات",
  startSync: "تشغيل المزامنة",
  stopSync: "إيقاف المزامنة",
  clearSel: "إلغاء التحديد",
  noColsTitle: "لا توجد منصات متصلة بعد",
  noColsBody: "اربط منصة واحدة على الأقل لتربط شققك بإعلاناتها.",
  goPlat: "اذهب إلى المنصات",
  colApartment: "الشقة",
  colPlatforms: "المنصات",
  colSyncing: "المزامنة",
  colUnitType: "نوع الوحدة",
  select: (name: string) => `تحديد ${name}`,
  identical: (n: number) => `${n} شقق متطابقة`,
  unlink: "فك الربط",
  subPaused: "متوقف · أعد الربط",
  subUnlisted: "أُوقف على المنصة",
  subFailed: "لم تبدأ المزامنة",
  subLive: "مباشر",
  subOff: "المزامنة متوقفة",
  guestsWarn: (a: number, b: number) => `الضيوف: ${a} في Omnirent و${b} على المنصة`,
  seeWhy: "اعرف السبب",
  ratePlans: (n: number) => `خطط الأسعار: ${n}`,
  suggested: "تطابق مقترح",
  suggestedPhone: "مقترح",
  confirm: "تأكيد",
  notThis: "ليس هذا",
  linkListing: "ربط بإعلان",
  linkPhone: "ربط",
  notOnIt: "غير موجود عليها بعد؟",
  waitPlatform: "بانتظار المنصة",
  waitPhone: "بالانتظار",
  propWaiting: "العقار بانتظار المنصة",
  propNotHere: "العقار غير متصل على هذه المنصة",
  propDeclined: "رفضت المنصة ربط هذا العقار",
  connectProp: "اربط العقار",
  platCount: (n: number) => plats("ar", n),
  notOnAny: "غير منشور على أي منصة",
  syncOn: "المزامنة تعمل",
  syncOff: "المزامنة متوقفة",
  footnote:
    "عند تشغيل المزامنة تُرسل الأسعار والإتاحة وقواعد الإقامة من Omnirent إلى كل منصة مربوطة، وتصل الحجوزات من كل المنصات إلى تقويم واحد. الصور والوصف تُعدّل على كل منصة حالياً.",
  propFootnote: "الأسعار والإتاحة والحجوزات تتزامن. الصور والوصف تُعدّل على كل منصة حالياً.",
  manageAll: "إدارة كل المنصات",

  // Loading and error
  loading: "جارٍ التحميل",
  errorTitle: "تعذّر تحميل المنصات",
  errorBody: "تحقق من اتصالك ثم حاول مرة أخرى. المزامنة مع منصاتك مستمرة.",
  retry: "إعادة المحاولة",

  // Dialog common
  close: "إغلاق",
  cancel: "إلغاء",
  done: "تم",
  copy: "نسخ",
  copied: "تم النسخ.",
  failed: "تعذّر الحفظ. حاول مرة أخرى.",

  // Imported bookings
  impTitle: (p: string) => `تم ربط ${p}`,
  impTitleProp: (r: string, p: string) => `تم ربط ${r} على ${p}`,
  impIntro: "قبل أي مزامنة، أحضرنا حجوزاتك القادمة حتى لا يتكرر حجز نفس التواريخ.",
  impFound: (n: number) => `الإعلانات التي وجدناها: ${n}`,
  impBookings: (n: number) => `الحجوزات القادمة المستوردة: ${n}. تواريخها محجوبة في تقويمك وعلى كل منصاتك.`,
  impMatches: (n: number) => `التطابقات المقترحة لشققك: ${n}`,
  impNoMatches: "لا تطابقات مقترحة. اربط الإعلانات بشققك يدوياً.",
  impNote: "لا يتغير شيء على المنصة حتى تشغّل المزامنة لكل شقة.",
  reviewMatches: "راجع التطابقات",

  // Airbnb
  abbTitle: "ربط Airbnb",
  abbIntro: "ستوافق على Omnirent في صفحة Airbnb ثم تعود إلى هنا. سنرى إعلاناتك وأسعارها وتقويمها. لن يتغير شيء على Airbnb حتى تشغّل المزامنة بنفسك.",
  beforeStart: "قبل أن تبدأ",
  abbReq: [
    "سجّل الدخول بحساب المضيف المالك للإعلانات، وليس حساب مضيف مشارك",
    "افصل أي نظام إدارة قنوات آخر من إعدادات Airbnb، فـ Airbnb يسمح بنظام واحد فقط",
    "تأكد أن بريدك وصورتك موثقان على Airbnb",
  ],
  abbWaitTitle: "وافق في صفحة Airbnb التي فُتحت",
  abbWaitBody: "بعد الموافقة يعيدك Airbnb إلى هنا تلقائياً. إذا أغلقت الصفحة، اضغط «متابعة إلى Airbnb» مرة أخرى.",
  abbGo: "متابعة إلى Airbnb",
  abbReconnected: "أُعيد ربط Airbnb واستُؤنفت المزامنة.",
  abbNoProperty: "انشر عقاراً واحداً على الأقل من «العقارات» أولاً، ثم اربط Airbnb.",
  abbCancelled: "لم يكتمل الربط مع Airbnb. حاول مجدداً.",

  // Connect guide
  gTitle: (p: string) => `ربط ${p}`,
  gTitleProp: (p: string) => `ربط عقار على ${p}`,
  gTitleRe: (p: string) => `أعد ربط ${p}`,
  gIntro: {
    ext: "الربط يتم من حسابك على المنصة نفسها، ثم تدخل البيانات هنا. يتم لكل عقار على حدة.",
    login: "سجّل الدخول إلى حسابك على المنصة في نافذة آمنة لنربطه. لا نستخدم بيانات الدخول لأي شيء آخر.",
    sup: (p: string) => `${p} يفعّل الربط عبر فريق دعمه. أرسل لهم الرسالة الجاهزة أدناه، ثم أدخل الرقم الذي يرسلونه.`,
    request: "لا تحتاج حساباً على هذه المنصة. نفعّلها لشققك المتزامنة.",
    unk: (p: string) => `ليس لدينا دليل لـ ${p} بعد. أرسل لدعمهم الرسالة الجاهزة أدناه ليفعّلوا الربط، ثم أدخل الرقم الذي يرسلونه.`,
  },
  whichProp: "أي عقار تريد ربطه؟",
  whichPropNote: "على هذه المنصة كل عقار يُربط وحده برقمه الخاص. كرّر الخطوات لكل عقار.",
  declinedLast: "سبب الرفض السابق:",
  declinedFix: "أصلح ذلك على المنصة ثم أعد الخطوات.",
  checkFirst: "تأكد أولاً",
  steps: "الخطوات",
  picAria: "رسم مبسّط للشاشة على المنصة",
  picAccount: "· حساب العقار",
  picCaption: "رسم مبسّط للخطوات المرقّمة أعلاه. الشكل الفعلي على المنصة قد يختلف قليلاً، وسنستبدله بصور حقيقية قبل الإطلاق.",
  readyMsg: "الرسالة الجاهزة (بالإنجليزية لأن الدعم يتعامل بها)",
  msgTo: (e: string, p: string) => `أرسلها إلى ${e} أو عبر محادثة الدعم في حسابك على ${p}.`,
  msgToChat: (p: string) => `أرسلها عبر محادثة الدعم أو بريد الدعم في حسابك على ${p}.`,
  msgCopied: "نُسخت الرسالة. الصقها في رسالتك إلى الدعم.",
  needHelp: "تحتاج مساعدة؟ يتصل بك فريقنا ويُنهي الخطوات معك",
  needHelpPhone: "تحتاج مساعدة؟ يتصل بك فريقنا",
  helpSent: "أرسلنا طلبك. سيتواصل معك فريقنا لإتمام الخطوة معك.",
  btn: {
    ext: "تحقق واربط",
    login: (p: string) => `تسجيل الدخول إلى ${p}`,
    sent: "أرسلت الرسالة",
    request: "اطلب التفعيل",
  },
  errAllConnected: "كل عقاراتك متصلة بالفعل على هذه المنصة.",
  errFill: "أكمل كل الحقول المطلوبة.",
  errReach: "لم نصل إلى هذا العقار. تأكد أنك أكملت الخطوات على المنصة ثم حاول مجدداً.",
  errCmBdc:
    "هذا العقار ما زال مربوطاً بمدير قنوات آخر على Booking.com. من الحساب › مزود خدمة الربط › أنهِ الربط القديم، انتظر 15 دقيقة تقريباً، ثم حاول مجدداً.",
  errCm: (p: string) => `هذا العقار ما زال مربوطاً بمدير قنوات آخر على ${p}. أنهِ الربط القديم من إعدادات الربط على ${p} أولاً، ثم حاول مجدداً.`,
  errNoProps: "أضف عقاراً من «العقارات» أولاً.",
  toastConfirmSent: (p: string, r: string) => `أرسلنا طلب ربط ${r} إلى ${p}. سنخبرك عند التأكيد.`,
  toastSupWait: (p: string) => `بانتظار رد ${p}. عندما يرسلون الرقم افتح «إدارة» وأدخله.`,
  toastRequest: (p: string) => `طلبنا تفعيل ${p}. سنخبرك عند الانتهاء.`,
  toastReconnected: (p: string) => `أُعيد ربط ${p} واستُؤنفت المزامنة.`,

  // Manage
  mCount: (n: number) => `الشقق المربوطة بهذه المنصة: ${n}`,
  account: "الحساب",
  mWait: "ننتظر رد المنصة. سنخبرك عند الربط.",
  enterId: "أدخل الرقم",
  priceTitle: "السعر على هذه المنصة",
  priceBody: "غطِّ عمولة المنصة دون تعديل أسعارك مرتين. يُطبَّق على كل الشقق المربوطة بهذه المنصة.",
  modeSame: "نفس السعر",
  modeUp: "أعلى بنسبة",
  modeDown: "أقل بنسبة",
  percentage: "النسبة",
  mkEx: (a: string, b: string, p: string, unit: string, cur: string) => `مثال: ${unit} بسعر ${a} ${cur} في Omnirent يصبح ${b} ${cur} على ${p}`,
  savePrice: "حفظ السعر",
  pctErr: "أدخل نسبة بين 1 و50.",
  priceSame: (p: string) => `أسعار ${p} الآن نفس أسعار Omnirent.`,
  priceSaved: (p: string) => `تم الحفظ. تُرسل الأسعار إلى ${p} بعد التعديل.`,
  propsHere: "العقارات المتصلة على هذه المنصة",
  propsHereBody: "لكل عقار اتصال منفصل. حالة المنصة تُحسب من حالات عقاراتك.",
  idOf: (i: string) => `رقم العقار ${i}`,
  waitingId: "بانتظار رقم العقار",
  usdLine: (r: string) => `الأسعار بالدولار · 1 دولار = ${r} ج.م`,
  connectAnother: "ربط عقار آخر",
  disconnectPlat: "فصل المنصة",

  // Disconnect
  discTitle: (p: string) => `فصل ${p}؟`,
  discTxt: (p: string, n: number) => `ستتوقف مزامنة الأسعار والإتاحة والحجوزات مع ${p} للشقق المربوطة (${n}). لن نحذف شيئاً من Omnirent أو من ${p}.`,
  discBlocked: "لا يمكن الفصل الآن لأن هناك حجوزات قادمة من هذه المنصة. بعد الفصل لن تصلنا تعديلاتها أو إلغاءاتها.",
  discAfter: "افصل بعد آخر مغادرة، أو انقل الحجوزات أو ألغها أولاً.",
  disconnect: "فصل",
  openCal: "افتح الحجوزات في التقويم",
  disconnected: (p: string) => `تم فصل ${p}. شققك في Omnirent لم تتأثر، وإعلاناتك على ${p} لم تُحذف.`,

  // Pull from Airbnb
  pullTitle: "اسحب إعلاناتك من Airbnb",
  pullIntro: "اختر الإعلانات التي تريد إضافتها إلى Omnirent. ننسخ الاسم والوصف والصور والغرف والمرافق والقواعد والسعر. لا يتغير شيء على Airbnb.",
  selectAllNew: "تحديد كل الجديد",
  pullCount: (l: number, n: number) => `وجدنا ${lists("ar", l)} على Airbnb · ${n} جديدة`,
  guests: (g: number) => `${g} ضيوف`,
  inOmnirent: (u: string) => `موجود في Omnirent · ${u}`,
  isNew: "جديد",
  pullBtn: (n: number) => `أضف المحدد إلى Omnirent (${n})`,
  pullFirst: "اختر الإعلانات أولاً",
  pulled: (n: number) => `أُضيفت ${apts("ar", n)} إلى Omnirent مع الصور والوصف. Airbnb لم يتغير حتى تشغّل المزامنة.`,

  // Pick a listing
  pickTitle: (u: string, p: string) => `اربط ${u} بإعلان على ${p}`,
  linkedTo: (u: string) => `مربوط بـ ${u}`,
  available: "متاح للربط",
  availableWarn: (b: number, a: number) => `متاح · تنبيه: الضيوف ${b} على المنصة و${a} في Omnirent`,
  noPick: "لم نجد إعلانات على هذه المنصة بعد.",
  linked: "تم الربط. شغّل المزامنة عندما تكون جاهزاً.",
  linkedWarn: (a: number, b: number, p: string) => `تم الربط. تنبيه: عدد الضيوف ${a} في Omnirent و${b} على ${p}.`,
  unlinked: (u: string, p: string) => `تم فك ربط ${u} من ${p}.`,
  confirmedN: (n: number) => `تم تأكيد ${n} من الروابط المقترحة.`,

  // Not on it yet
  createTitle: (u: string, p: string) => `${u} غير موجود على ${p} بعد`,
  createTxt: (p: string) =>
    `أنشئ الإعلان بنفسك على ${p} (لا يمكن لـ Omnirent إنشاء إعلانات على المنصات). انسخ البيانات أدناه، وبعد نشر الإعلان عد واضغط «ربطه الآن».`,
  cName: "الاسم",
  cIdentical: "عدد الشقق المتطابقة",
  cPhotos: "الصور والوصف",
  cPhotosV: "من صفحة العقار في Omnirent",
  createAfter: "بعد إنشاء الإعلان على المنصة، عد واضغط «ربطه الآن».",
  linkNow: "ربطه الآن",

  // Rate plans
  ratesTitle: (u: string, p: string) => `خطط الأسعار · ${u} على ${p}`,
  ratesIntro: "لكل خطة أسعار على المنصة، اختر أي سعر من Omnirent يُرسل إليها. الخطط التي تختار لها «لا ترسل أسعاراً» تبقى مغلقة للبيع.",
  ratesFresh: "طابقناها بالاسم. راجعها قبل تشغيل المزامنة.",
  noPrices: "لا ترسل أسعاراً",
  rpErr: (p: string) => `اختر سعراً لخطة واحدة على الأقل، وإلا لن تصل أي أسعار إلى ${p}.`,
  saveRates: "حفظ خطط الأسعار",
  ratesSaved: "تم حفظ خطط الأسعار. شغّل المزامنة عندما تكون جاهزاً.",

  // Syncing
  noLinks: "لا توجد روابط لتشغيلها.",
  syncStarted: (n: number) => `بدأت المزامنة لـ ${n} من الروابط. أرسلنا الأسعار والإتاحة كاملة أولاً.`,
  syncStopped: (u: string) => `أُوقفت مزامنة ${u}.`,
  syncStoppedN: (n: number) => `أُوقفت المزامنة لـ ${n} من الروابط.`,
  syncStartedOn: (p: string) => `بدأت المزامنة على ${p}.`,
  actTitle: (n: number, t: number) => `لم تبدأ المزامنة لـ ${n} من ${t}`,
  actIntro: "نرسل الأسعار والإتاحة كاملة لكل رابط قبل أن يصبح مباشراً. الروابط التي لم تبدأ تبقى متوقفة ولا يُحجز عليها شيء.",
  actLive: "مباشر · بدأت المزامنة",
  actNot: "لم تبدأ",
  why: "السبب:",
  howFix: "الحل:",
  tryAgain: "حاول مجدداً",
  // Why syncing didn't start, when the platform gives no reason of its own.
  failUnpublished: "هذه الشقة لم تُنشر بعد، فلا توجد أسعار وإتاحة لإرسالها.",
  failUnpublishedFix: "انشر العقار من «العقارات»، ثم اضغط «حاول مجدداً».",
  failPlatform: (p: string) => `رفض ${p} استقبال الأسعار والإتاحة لهذا الإعلان.`,
  failPlatformFix: (p: string) => `تأكد أن الإعلان مفعّل ومكتمل على ${p}، ثم اضغط «حاول مجدداً».`,
  failReach: "لم نصل إلى المنصة الآن.",
  failReachFix: "حاول مجدداً بعد دقيقة.",

  // Unlink blocked
  unTitle: (u: string) => `لا يمكن فك ربط ${u} الآن`,
  unTxt: (p: string) => `لهذه الشقة حجوزات قادمة من ${p}. لو فككنا الربط الآن لن تصلنا تعديلات أو إلغاءات هذه الحجوزات، وقد يُحجز نفس التاريخ مرتين.`,
  toUnlink: "لفك الربط:",
  unSteps: (p: string) => [
    "انتظر حتى يغادر آخر ضيف، ثم فك الربط.",
    "أو انقل كل حجز إلى شقة أخرى من التقويم.",
    `أو ألغِ الحجز على ${p} (قد تُطبق رسوم إلغاء).`,
  ],
  bookingLine: (code: string, guest: string, from: string, to: string, now: boolean) =>
    [code, guest, now ? `يقيم الآن حتى ${dayAr(to)}` : rangeAr(from, to)].filter(Boolean).join(" · "),

  // Currency
  curTitle: (r: string, p: string) => `عملة ${r} على ${p} مختلفة`,
  curTxt: (p: string, own: string, theirs: string) =>
    `أسعارك في Omnirent ${curName("ar", own)}، لكن هذا العقار على ${p} مضبوط ${curName("ar", theirs)}. لن نرسل أسعاراً قبل أن تختار.`,
  curAria: "كيف نتعامل مع العملة؟",
  curAsk: (own: string) => `اطلب تغيير العملة إلى ${curShort("ar", own)} (موصى به)`,
  curAskBody: "يراسل فريقنا المنصة. يبقى العقار بانتظار المنصة حتى تتغير العملة، ثم يتصل تلقائياً.",
  curConv: (theirs: string) => `أرسل الأسعار ${curName("ar", theirs)} بسعر صرف أحدده`,
  curConvBody: (theirs: string) =>
    `نحوّل أسعارك قبل إرسالها. الحجوزات تصل ${curName("ar", theirs)} وتظهر في Omnirent ${curName("ar", theirs)}. راجع سعر الصرف كل شهر.`,
  curRate: (own: string, theirs: string) => `1 ${curShort("ar", theirs)} = (${curName("ar", own)})`,
  curEx: (a: string, b: string, p: string, own: string, theirs: string) => `مثال: ${a} ${own} تصبح ${b} ${theirs} على ${p}`,
  curErr: "أدخل سعر صرف أكبر من صفر.",
  curAsked: (p: string, own: string) => `طلب فريقنا من ${p} تغيير عملة العقار إلى ${curShort("ar", own)}. سنخبرك عند التأكيد.`,
  continue: "متابعة",

  // VRBO sign-in window
  vpTitle: (p: string) => `تسجيل الدخول إلى ${p}`,
  vpEmail: "البريد الإلكتروني لحساب VRBO",
  vpPw: "كلمة المرور",
  vpSafe: "نستخدم بيانات الدخول للربط فقط عبر شريك الربط الآمن، ولا يراها أحد.",
  vpBusy: "نحاول تسجيل الدخول… سيرسل VRBO رمزاً إلى هاتفك.",
  vpSent: (p: string) => `أرسل ${p} رمزاً من 6 أرقام برسالة نصية إلى هاتف مالك الحساب.`,
  vpCode: "رمز التحقق",
  vpConnect: "اربط",
  vpResend: "لم يصلك؟ أرسل رمزاً جديداً",
  vpResent: "أُرسل رمز جديد.",
  vpErrFill: "أدخل البريد وكلمة المرور.",
  vpErrAuth: (p: string) => `لم يقبل ${p} البريد أو كلمة المرور. تأكد منهما وحاول مجدداً.`,
  vpErrCode6: "أدخل الرمز المكوّن من 6 أرقام.",
  vpErrCode: "الرمز غير صحيح أو انتهت صلاحيته. أعد إدخاله أو اطلب رمزاً جديداً.",
  // Reconnecting (phone board ChanPhoneVrbo; the Arabic isn't in the design).
  vpReIntro: "أدخل كلمة المرور الجديدة. روابط شققك تبقى كما هي.",
  vpNewPw: "كلمة المرور الجديدة",

  // Notices (bell)
  justNow: "الآن",
  minutesAgo: (n: number) => pla(n, "منذ دقيقة", "منذ دقيقتين", "منذ {n} دقائق", "منذ {n} دقيقة"),
  hoursAgo: (n: number) => pla(n, "منذ ساعة", "منذ ساعتين", "منذ {n} ساعات", "منذ {n} ساعة"),
  yesterday: "أمس",
  dateOf: (iso: string) => dayAr(iso),
  notice: {
    connected: (o: NoticeArgs) => `تم ربط ${o.p}.`,
    propConnected: (o: NoticeArgs) => `تم ربط ${o.r} على ${o.p}.`,
    confirmed: (o: NoticeArgs) => `أكّد ${o.p} ربط ${o.r}. العقار متصل الآن.`,
    declined: (o: NoticeArgs) => `رفض ${o.p} ربط ${o.r}. اعرف السبب وحاول مجدداً.`,
    syncFail: (o: NoticeArgs) => `لم تبدأ المزامنة لـ ${o.n} من الروابط. اعرف السبب.`,
    loginStopped: (o: NoticeArgs) => `توقف ${o.p} عن قبول بيانات دخولك. أعد الربط لاستئناف المزامنة.`,
    accessRemoved: () => "أُلغي الوصول من Airbnb. أعد الربط لاستئناف المزامنة.",
    reconnected: (o: NoticeArgs) => `أُعيد ربط ${o.p} واستُؤنفت المزامنة.`,
    roomGone: (o: NoticeArgs) => `حذف ${o.p} غرفة «${o.room}» المربوطة بـ${o.u}.`,
    unlinkedBooking: (o: NoticeArgs) => `حجز من ${o.p} رقم ${o.code} لغرفة «${o.room}» غير مربوطة بأي شقة.`,
    rate: (o: NoticeArgs) => `رفض ${o.p} سعراً أرسلناه. اعرف السبب.`,
    stillWaiting: (o: NoticeArgs) => `ما زلنا ننتظر رد ${o.p} على رسالتك بخصوص ${o.r}.`,
  } as Record<string, (o: NoticeArgs) => string>,

  // Issues
  issue: {
    unlinked: {
      title: "حجز لغرفة غير مربوطة",
      text: (o: IssueArgs) =>
        `حجز من ${o.p} رقم ${o.code} (${o.dates}) لغرفة «${o.room}». هذه الغرفة غير مربوطة بأي شقة، لذا لم تُحجب التواريخ في تقويمك بعد.`,
      fix: (o: IssueArgs) => (o.u ? `اربطها بـ ${o.u}` : "اربط غرفة أخرى"),
    },
    rate: {
      title: "سعر رفضته المنصة",
      text: (o: IssueArgs) => `رفض ${o.p} سعراً أرسلناه${o.u ? ` لـ ${o.u}` : ""}${o.dates ? ` ليلة ${o.dates}` : ""}. ${o.msg ?? ""}`.trim(),
      fix: () => "افتح الليلة في التقويم",
    },
    roomgone: {
      title: "حُذفت غرفة على المنصة",
      text: (o: IssueArgs) =>
        `حذف ${o.p} غرفة «${o.room}» التي كانت مربوطة بـ${o.u}. لم يكن عليها حجوزات قادمة، فألغينا الربط تلقائياً. لو حُذفت بالخطأ، أنشئها مجدداً على ${o.p} ثم اربطها.`,
      fix: () => "اربط غرفة أخرى",
    },
    unlisted: {
      title: "إعلان أُوقف على المنصة",
      text: (o: IssueArgs) => `أُوقف إعلان «${o.room}» على ${o.p}، فلن يظهر للضيوف حتى يُعاد نشره.`,
      fix: (o: IssueArgs) => `أعد نشره على ${o.p}`,
    },
  },
  issueLinked: "تم الربط. الحجز الآن في تقويمك والتواريخ محجوبة على كل المنصات.",

  // Properties
  colConnected: "المنصات المتصلة",
  connectedOn: (n: number) => `متصل على ${plats("ar", n)}`,
  unitDeleteBlocked: "لهذا النوع حجوزات قادمة من المنصات، فلا يمكن حذفه الآن. انتظر آخر مغادرة أو انقل الحجوزات أولاً.",
};

export type NoticeArgs = { p: string; r: string; n: number; room: string; u: string; code: string };
export type IssueArgs = { p: string; u: string; room: string; code: string; dates: string; msg?: string };

export type ChannelDict = typeof ar;

function curName(lang: Lang, code: string) {
  const arNames: Record<string, string> = { EGP: "بالجنيه المصري", USD: "بالدولار الأمريكي", EUR: "باليورو", GBP: "بالجنيه الإسترليني", SAR: "بالريال السعودي", AED: "بالدرهم الإماراتي" };
  const enNames: Record<string, string> = { EGP: "EGP", USD: "USD", EUR: "EUR", GBP: "GBP", SAR: "SAR", AED: "AED" };
  return lang === "ar" ? (arNames[code] ?? `بعملة ${code}`) : (enNames[code] ?? code);
}
function curShort(lang: Lang, code: string) {
  const arNames: Record<string, string> = { EGP: "الجنيه المصري", USD: "دولار أمريكي", EUR: "يورو", GBP: "جنيه إسترليني" };
  return lang === "ar" ? (arNames[code] ?? code) : code;
}

export function apts(lang: Lang, n: number) {
  if (lang === "ar") return n === 0 ? "لا شقق" : pla(n, "شقة واحدة", "شقتان", "{n} شقق", "{n} شقة");
  return n === 0 ? "No apartments" : n === 1 ? "1 apartment" : `${n} apartments`;
}
export function plats(lang: Lang, n: number) {
  if (lang === "ar") return n === 0 ? "لا منصات" : pla(n, "منصة واحدة", "منصتان", "{n} منصات", "{n} منصة");
  return n === 0 ? "No platforms" : n === 1 ? "1 platform" : `${n} platforms`;
}
export function lists(lang: Lang, n: number) {
  if (lang === "ar") return pla(n, "إعلان واحد", "إعلانان", "{n} إعلانات", "{n} إعلاناً");
  return n === 1 ? "1 listing" : `${n} listings`;
}
const props = (n: number) => (n === 1 ? "1 property" : `${n} properties`);
const links = (n: number) => (n === 1 ? "1 link" : `${n} links`);

const en: ChannelDict = {
  channels: "Channels",
  intro: "Connect your booking platforms first, then link each apartment to its listing on each platform. Prices, availability and bookings stay the same everywhere.",

  notifications: "Notifications",
  bellLabel: (n) => `Notifications (${n} unread)`,
  markAll: "Mark all as read",
  unread: "Unread",
  noNotifs: "You’re all caught up. We’ll tell you here when anything changes on your platforms.",
  byEmail: "Important ones also come by email: rejections, stopped syncing, bookings for unlinked rooms.",
  byEmailPhone: "Important ones also come by email.",
  back: "Back",

  tabPlat: "Platforms",
  tabLinks: "Apartments & links",
  kOn: "Connected platforms",
  kWait: "Waiting for platform",
  kAttn: "Need attention",
  kLive: "Apartments syncing to at least one platform",
  kOnPhone: "Connected",
  kWaitPhone: "Waiting",
  kLivePhone: "Syncing",
  aOfB: (a, b) => `${a} of ${b}`,

  issuesTitle: (n) => `Needs your attention (${n})`,
  dismiss: "Dismiss",
  dismissed: "Alert dismissed.",

  startTitle: "Start by connecting your first platform",
  startBody: "You don’t need any listings in Omnirent yet. Connect Airbnb to pull your listings from it, or connect any other platform with its property ID.",
  searchPlatforms: "Search platforms",
  searchPhone: (n) => `Search ${n} platforms`,
  filterAll: "All",
  filterOn: "Connected",
  filterWait: "Waiting",
  filterOff: "Not connected",
  recTitle: "Recommended for Egypt",
  recSub: "The most booked for apartments in your market",
  allTitle: (n) => `All platforms (${n})`,
  results: (n) => `Results (${n})`,
  colPlatform: "Platform",
  colStatus: "Status",
  colLinked: "Linked apartments",
  showAll: (n) => `Show all platforms (${n})`,
  noResults: "No platforms match your search or filter.",

  st: { on: "Connected", wait: "Waiting for platform", attn: "Needs attention", off: "Not connected", rej: "Rejected", na: "Not for apartments" },
  how: {
    account: "One approval on the platform",
    ext: "Steps on the platform + property ID",
    login: "Your platform login",
    sup: "You ask the platform’s support",
    request: "We turn it on for you",
    unk: "You ask the platform’s support",
    na: "Doesn’t accept apartments",
  },
  countProp: (a, c) => `${props(a)} connected · ${apts("en", c)} linked`,
  countWaiting: (w) => ` · ${w} waiting`,
  countLinked: (n) => `${apts("en", n)} linked`,
  samePrice: "Same price as Omnirent",
  priceUp: (v) => `Price +${v}%`,
  priceDown: (v) => `Price −${v}%`,
  btnNa: "Not available",
  btnRequest: "Request connection",
  btnConnect: "Connect",
  btnReconnect: "Reconnect",
  btnTryAgain: "Try again",
  btnManage: "Manage",
  noteAbbAttn: "Access was removed on Airbnb. Reconnect to resume syncing.",
  noteLoginAttn: (p) => `${p} stopped accepting your login (the password changed or expired). Reconnect with your new password. Syncing is paused.`,
  noteConfirm: (p) => `Request sent. We’re waiting for ${p} to confirm and will tell you when it’s live.`,
  noteRequest: "We asked to turn it on. We’ll tell you when it’s done.",
  noteSup: "Waiting for the platform’s support to reply to your message. When you get the ID, open Manage and enter it.",

  pullAbb: "Pull my listings from Airbnb",
  pullAbbPhone: "Pull from Airbnb",
  addManual: "Add an apartment manually",
  confirmAll: (n) => `Confirm all suggestions (${n})`,
  suggTxt: (n) => `We have ${n} suggested links. Review them or confirm them all.`,
  bulkActions: "Bulk actions",
  selected: (n) => `${apts("en", n)} selected`,
  confirmSugg: "Confirm suggestions",
  startSync: "Start syncing",
  stopSync: "Stop syncing",
  clearSel: "Clear selection",
  noColsTitle: "No platforms connected yet",
  noColsBody: "Connect at least one platform to link your apartments to their listings.",
  goPlat: "Go to platforms",
  colApartment: "Apartment",
  colPlatforms: "Platforms",
  colSyncing: "Syncing",
  colUnitType: "Unit type",
  select: (name) => `Select ${name}`,
  identical: (n) => `${n} identical apartments`,
  unlink: "Unlink",
  subPaused: "Paused · reconnect",
  subUnlisted: "Unlisted on the platform",
  subFailed: "Syncing didn’t start",
  subLive: "Live",
  subOff: "Syncing off",
  guestsWarn: (a, b) => `Guests: ${a} in Omnirent, ${b} on the platform`,
  seeWhy: "See why",
  ratePlans: (n) => `Rate plans: ${n}`,
  suggested: "Suggested match",
  suggestedPhone: "Suggested",
  confirm: "Confirm",
  notThis: "Not this",
  linkListing: "Link a listing",
  linkPhone: "Link",
  notOnIt: "Not on it yet?",
  waitPlatform: "Waiting for platform",
  waitPhone: "Waiting",
  propWaiting: "Property waiting for platform",
  propNotHere: "Property not connected here",
  propDeclined: "The platform declined this property",
  connectProp: "Connect property",
  platCount: (n) => plats("en", n),
  notOnAny: "Not on any platform",
  syncOn: "Syncing on",
  syncOff: "Syncing off",
  footnote:
    "With syncing on, prices, availability and stay rules go from Omnirent to every linked platform, and bookings from all platforms arrive in one calendar. Photos and descriptions are edited on each platform for now.",
  propFootnote: "Prices, availability and bookings sync. Photos and descriptions are edited on each platform for now.",
  manageAll: "Manage all platforms",

  loading: "Loading",
  errorTitle: "Couldn’t load your platforms",
  errorBody: "Check your connection and try again. Syncing with your platforms continues.",
  retry: "Try again",

  close: "Close",
  cancel: "Cancel",
  done: "Done",
  copy: "Copy",
  copied: "Copied.",
  failed: "Couldn’t save. Try again.",

  impTitle: (p) => `${p} is connected`,
  impTitleProp: (r, p) => `${r} is connected to ${p}`,
  impIntro: "Before any syncing, we brought in your upcoming bookings so the same dates can’t be booked twice.",
  impFound: (n) => `${lists("en", n)} found`,
  impBookings: (n) => `${n} upcoming bookings imported. Their dates are blocked in your calendar and on all your platforms.`,
  impMatches: (n) => `${n} suggested matches for your apartments`,
  impNoMatches: "No suggested matches. Link the listings to your apartments yourself.",
  impNote: "Nothing changes on the platform until you turn on syncing for each apartment.",
  reviewMatches: "Review matches",

  abbTitle: "Connect Airbnb",
  abbIntro: "You’ll approve Omnirent on an Airbnb page, then come back here. We’ll see your listings, their prices and calendar. Nothing changes on Airbnb until you turn on syncing yourself.",
  beforeStart: "Before you start",
  abbReq: [
    "Log in with the host account that owns the listings, not a co-host account",
    "Disconnect any other channel manager in your Airbnb settings. Airbnb allows only one",
    "Make sure your email and profile photo are verified on Airbnb",
  ],
  abbWaitTitle: "Approve on the Airbnb page that opened",
  abbWaitBody: "After you approve, Airbnb brings you back here automatically. If you closed the page, press “Continue to Airbnb” again.",
  abbGo: "Continue to Airbnb",
  abbReconnected: "Airbnb reconnected and syncing resumed.",
  abbNoProperty: "Publish at least one property from Properties first, then connect Airbnb.",
  abbCancelled: "Airbnb didn’t finish connecting. Try again.",

  gTitle: (p) => `Connect ${p}`,
  gTitleProp: (p) => `Connect a property to ${p}`,
  gTitleRe: (p) => `Reconnect ${p}`,
  gIntro: {
    ext: "You turn on the connection in your own account on the platform, then enter the details here. Each property connects on its own.",
    login: "Sign in to your platform account in a secure window so we can connect it. We don’t use your login for anything else.",
    sup: (p) => `${p} turns on connections through its support team. Send them the ready message below, then enter the ID they send back.`,
    request: "You don’t need an account on this platform. We turn it on for your syncing apartments.",
    unk: (p) => `We don’t have a guide for ${p} yet. Send their support the ready message below so they turn on the connection, then enter the ID they send back.`,
  },
  whichProp: "Which property are you connecting?",
  whichPropNote: "On this platform each property connects on its own, with its own ID. Repeat these steps for each property.",
  declinedLast: "Why it was declined last time:",
  declinedFix: "Fix that on the platform, then repeat the steps.",
  checkFirst: "Check first",
  steps: "Steps",
  picAria: "Simplified picture of the screen on the platform",
  picAccount: "· property account",
  picCaption: "Simplified picture of the numbered steps above. The real screen may look slightly different; we’ll swap in real screenshots before launch.",
  readyMsg: "Ready message",
  msgTo: (e, p) => `Send it to ${e} or through the support chat in your ${p} account.`,
  msgToChat: (p) => `Send it through the support chat or support email in your ${p} account.`,
  msgCopied: "Message copied. Paste it into your message to support.",
  needHelp: "Need help? Our team calls you and does the steps with you",
  needHelpPhone: "Need help? Our team calls you",
  helpSent: "Request sent. Our team will contact you to do this step together.",
  btn: { ext: "Check and connect", login: (p) => `Sign in to ${p}`, sent: "I’ve sent the message", request: "Request it" },
  errAllConnected: "All your properties are already connected on this platform.",
  errFill: "Fill in all the fields.",
  errReach: "We couldn’t reach this property. Check you finished the steps on the platform, then try again.",
  errCmBdc:
    "This property is still connected to another channel manager on Booking.com. Go to Account › Connectivity provider › End connection for the old one, wait about 15 minutes, then try again.",
  errCm: (p) => `This property is still connected to another channel manager on ${p}. End the old connection in ${p}’s connectivity settings first, then try again.`,
  errNoProps: "Add a property from Properties first.",
  toastConfirmSent: (p, r) => `We sent the request to connect ${r} to ${p}. We’ll tell you when it’s confirmed.`,
  toastSupWait: (p) => `Waiting for ${p}’s reply. When they send the ID, open Manage and enter it.`,
  toastRequest: (p) => `We asked to turn on ${p}. We’ll tell you when it’s done.`,
  toastReconnected: (p) => `${p} reconnected and syncing resumed.`,

  mCount: (n) => `${apts("en", n)} linked to this platform`,
  account: "Account",
  mWait: "We’re waiting for the platform to reply. We’ll tell you once it’s connected.",
  enterId: "Enter the ID",
  priceTitle: "Price on this platform",
  priceBody: "Cover the platform’s commission without editing your prices twice. Applies to every apartment linked to this platform.",
  modeSame: "Same price",
  modeUp: "Higher by %",
  modeDown: "Lower by %",
  percentage: "Percentage",
  mkEx: (a, b, p, unit, cur) => `Example: ${unit} at ${cur} ${a} in Omnirent → ${cur} ${b} on ${p}`,
  savePrice: "Save price",
  pctErr: "Enter a percentage between 1 and 50.",
  priceSame: (p) => `${p} now uses the same prices as Omnirent.`,
  priceSaved: (p) => `Saved. Prices are sent to ${p} with the adjustment.`,
  propsHere: "Properties connected on this platform",
  propsHereBody: "Each property has its own connection. The platform status comes from your properties' statuses.",
  idOf: (i) => `ID ${i}`,
  waitingId: "Waiting for the ID",
  usdLine: (r) => `Prices in USD · 1 USD = EGP ${r}`,
  connectAnother: "Connect another property",
  disconnectPlat: "Disconnect platform",

  discTitle: (p) => `Disconnect ${p}?`,
  discTxt: (p, n) => `Prices, availability and bookings stop syncing with ${p} for ${apts("en", n)}. Nothing is deleted from Omnirent or from ${p}.`,
  discBlocked: "You can’t disconnect yet because there are upcoming bookings from this platform. After disconnecting, their changes or cancellations wouldn’t reach us.",
  discAfter: "Disconnect after the last check-out, or move or cancel the bookings first.",
  disconnect: "Disconnect",
  openCal: "Open the bookings in Calendar",
  disconnected: (p) => `${p} disconnected. Your apartments in Omnirent are unchanged and your listings on ${p} weren’t deleted.`,

  pullTitle: "Pull your listings from Airbnb",
  pullIntro: "Pick the listings to add to Omnirent. We copy the name, description, photos, rooms, amenities, rules and price. Nothing changes on Airbnb.",
  selectAllNew: "Select all new",
  pullCount: (l, n) => `We found ${lists("en", l)} on Airbnb · ${n} new`,
  guests: (g) => `${g} guests`,
  inOmnirent: (u) => `Already in Omnirent · ${u}`,
  isNew: "New",
  pullBtn: (n) => `Add ${apts("en", n)} to Omnirent`,
  pullFirst: "Select listings first",
  pulled: (n) => `${apts("en", n)} added to Omnirent with photos and descriptions. Airbnb stays unchanged until you turn on syncing.`,

  pickTitle: (u, p) => `Link ${u} to a ${p} listing`,
  linkedTo: (u) => `Linked to ${u}`,
  available: "Available",
  availableWarn: (b, a) => `Available · heads-up: ${b} guests on the platform, ${a} in Omnirent`,
  noPick: "We didn’t find any listings on this platform yet.",
  linked: "Linked. Turn on syncing when you’re ready.",
  linkedWarn: (a, b, p) => `Linked. Heads-up: guests are ${a} in Omnirent and ${b} on ${p}.`,
  unlinked: (u, p) => `${u} unlinked from ${p}.`,
  confirmedN: (n) => `${n} suggested links confirmed.`,

  createTitle: (u, p) => `${u} isn’t on ${p} yet`,
  createTxt: (p) =>
    `Create the listing yourself on ${p} (Omnirent can’t create listings on platforms). Copy the details below, and once the listing is live, come back and press “Link it now”.`,
  cName: "Name",
  cIdentical: "Identical apartments",
  cPhotos: "Photos and description",
  cPhotosV: "From the property page in Omnirent",
  createAfter: "After you create the listing on the platform, come back and press “Link it now”.",
  linkNow: "Link it now",

  ratesTitle: (u, p) => `Rate plans · ${u} on ${p}`,
  ratesIntro: "For each rate plan on the platform, choose which Omnirent rate it gets. Plans set to “Don’t send prices” stay closed for sale.",
  ratesFresh: "We matched them by name. Check them before you turn on syncing.",
  noPrices: "Don’t send prices",
  rpErr: (p) => `Pick a rate for at least one rate plan, or ${p} gets no prices.`,
  saveRates: "Save rate plans",
  ratesSaved: "Rate plans saved. Turn on syncing when you’re ready.",

  noLinks: "No links to start.",
  syncStarted: (n) => `Syncing started for ${n} links. We sent full prices and availability first.`,
  syncStopped: (u) => `Syncing stopped for ${u}.`,
  syncStoppedN: (n) => `Syncing stopped for ${n} links.`,
  syncStartedOn: (p) => `Syncing started on ${p}.`,
  actTitle: (n, t) => `Syncing didn’t start for ${n} of ${links(t)}`,
  actIntro: "We send full prices and availability for each link before it goes live. Links that didn’t start stay paused, so nothing can be booked on them.",
  actLive: "Live · syncing started",
  actNot: "Didn’t start",
  why: "Why:",
  howFix: "How to fix:",
  tryAgain: "Try again",
  failUnpublished: "This apartment isn’t published yet, so there are no prices and availability to send.",
  failUnpublishedFix: "Publish the property from Properties, then press Try again.",
  failPlatform: (p) => `${p} didn’t accept prices and availability for this listing.`,
  failPlatformFix: (p) => `Check the listing is active and complete on ${p}, then press Try again.`,
  failReach: "We couldn’t reach the platform just now.",
  failReachFix: "Try again in a minute.",

  unTitle: (u) => `You can’t unlink ${u} yet`,
  unTxt: (p) => `This apartment has upcoming bookings from ${p}. If we unlink now, changes or cancellations to these bookings won’t reach us, and the same dates could be booked twice.`,
  toUnlink: "To unlink it:",
  unSteps: (p) => [
    "Wait until the last guest checks out, then unlink.",
    "Or move each booking to another apartment from Calendar.",
    `Or cancel the booking on ${p} (cancellation fees may apply).`,
  ],
  bookingLine: (code, guest, from, to, now) => [code, guest, now ? `staying now until ${dayEn(to)}` : rangeEn(from, to)].filter(Boolean).join(" · "),

  curTitle: (r, p) => `${r} uses a different currency on ${p}`,
  curTxt: (p, own, theirs) => `Your Omnirent prices are in ${own}, but this property is set to ${theirs} on ${p}. We won’t send any prices until you choose.`,
  curAria: "How should we handle the currency?",
  curAsk: (own) => `Ask to change the currency to ${own} (recommended)`,
  curAskBody: "Our team contacts the platform. The property waits until the currency changes, then connects automatically.",
  curConv: (theirs) => `Send prices in ${theirs} at an exchange rate I set`,
  curConvBody: (theirs) => `We convert your prices before sending them. Bookings arrive in ${theirs} and show in Omnirent in ${theirs}. Review the rate every month.`,
  curRate: (own, theirs) => `1 ${theirs} = (in ${own})`,
  curEx: (a, b, p, own, theirs) => `Example: ${own} ${a} is sent as ${theirs} ${b} on ${p}`,
  curErr: "Enter an exchange rate above zero.",
  curAsked: (p, own) => `Our team asked ${p} to change the property’s currency to ${own}. We’ll tell you when it’s done.`,
  continue: "Continue",

  vpTitle: (p) => `Sign in to ${p}`,
  vpEmail: "VRBO email",
  vpPw: "Password",
  vpSafe: "We use your login only to connect, through our secure connection partner. No one sees it.",
  vpBusy: "Signing in… VRBO will text a code to your phone.",
  vpSent: (p) => `${p} texted a 6-digit code to the account owner’s phone.`,
  vpCode: "Verification code",
  vpConnect: "Connect",
  vpResend: "Didn’t get it? Send a new code",
  vpResent: "A new code was sent.",
  vpErrFill: "Enter your email and password.",
  vpErrAuth: (p) => `${p} didn’t accept the email or password. Check them and try again.`,
  vpErrCode6: "Enter the 6-digit code.",
  vpErrCode: "That code is wrong or expired. Re-enter it or get a new code.",
  vpReIntro: "Enter your new password. Your apartment links stay as they are.",
  vpNewPw: "New password",

  justNow: "Just now",
  minutesAgo: (n) => (n === 1 ? "1 minute ago" : `${n} minutes ago`),
  hoursAgo: (n) => (n === 1 ? "1 hour ago" : `${n} hours ago`),
  yesterday: "Yesterday",
  dateOf: (iso) => dayEn(iso),
  notice: {
    connected: (o) => `${o.p} is now connected.`,
    propConnected: (o) => `${o.r} is now connected to ${o.p}.`,
    confirmed: (o) => `${o.p} confirmed ${o.r}. The property is connected.`,
    declined: (o) => `${o.p} declined ${o.r}. See why and try again.`,
    syncFail: (o) => `Syncing didn’t start for ${o.n} link(s). See why.`,
    loginStopped: (o) => `${o.p} stopped accepting your login. Reconnect to resume syncing.`,
    accessRemoved: () => "Access was removed on Airbnb. Reconnect to resume syncing.",
    reconnected: (o) => `${o.p} reconnected and syncing resumed.`,
    roomGone: (o) => `${o.p} deleted the room “${o.room}” linked to ${o.u}.`,
    unlinkedBooking: (o) => `Booking ${o.code} from ${o.p} is for “${o.room}”, which isn’t linked to an apartment.`,
    rate: (o) => `${o.p} rejected a price we sent. See why.`,
    stillWaiting: (o) => `Still waiting for ${o.p} to reply to your message about ${o.r}.`,
  },

  issue: {
    unlinked: {
      title: "A booking for a room that isn’t linked",
      text: (o) =>
        `Booking ${o.code} from ${o.p} (${o.dates}) is for “${o.room}”. That room isn’t linked to an apartment, so the dates aren’t blocked in your calendar yet.`,
      fix: (o) => (o.u ? `Link it to ${o.u}` : "Link another room"),
    },
    rate: {
      title: "A price the platform rejected",
      text: (o) => `${o.p} rejected a price we sent${o.u ? ` for ${o.u}` : ""}${o.dates ? ` on ${o.dates}` : ""}. ${o.msg ?? ""}`.trim(),
      fix: () => "Open the night in Calendar",
    },
    roomgone: {
      title: "A room was deleted on the platform",
      text: (o) =>
        `${o.p} deleted the room “${o.room}” that was linked to ${o.u}. It had no upcoming bookings, so we removed the link. If it was deleted by mistake, create it again on ${o.p} and link it.`,
      fix: () => "Link another room",
    },
    unlisted: {
      title: "A listing was unlisted on the platform",
      text: (o) => `“${o.room}” was unlisted on ${o.p}, so guests can’t find it until it’s listed again.`,
      fix: (o) => `List it again on ${o.p}`,
    },
  },
  issueLinked: "Linked. The booking is now in your calendar and the dates are blocked on every platform.",

  colConnected: "Connected platforms",
  connectedOn: (n) => `Connected on ${plats("en", n)}`,
  unitDeleteBlocked: "This unit type has upcoming bookings from your platforms, so it can’t be deleted yet. Wait for the last check-out or move the bookings first.",
};

export const CHANNEL_DICTS: Record<Lang, ChannelDict> = { ar, en };

// "2 hours ago", "Yesterday", or the date, for the notifications list.
export function timeAgo(t: ChannelDict, at: string, now: number): string {
  const ms = now - new Date(at).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo(min);
  const h = Math.floor(min / 60);
  if (h < 24) return t.hoursAgo(h);
  if (h < 48) return t.yesterday;
  return t.dateOf(at.slice(0, 10));
}

export function dateRangeText(lang: Lang, from: string, to: string) {
  return lang === "ar" ? rangeAr(from, to) : rangeEn(from, to);
}

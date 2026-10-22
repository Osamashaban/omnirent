// The broker emails, in Arabic and English. The invite is the one on the
// Broker signup design (BrokerInviteEmail). The design has no separate reset
// email for brokers, so the reset email reuses the invite's layout with the
// Ops reset email's wording. Styles are inline because email apps ignore
// stylesheets.

import type { Email } from "./email";
import type { Lang } from "./i18n";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(lang: Lang, body: string) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const footer =
    lang === "ar"
      ? "Omnirent · لوحة الوسيط<br>وصلتك هذه الرسالة لأن فريق Omnirent أنشأ حساباً لشركتك."
      : "Omnirent · Broker dashboard<br>You got this email because the Omnirent team set up an account for your company.";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><body style="margin:0;background:#F3F4F6;font-family:Outfit,'IBM Plex Sans Arabic',Arial,sans-serif;color:#111827">
<div dir="${dir}" style="max-width:600px;margin:0 auto;padding:24px">
<div style="border-radius:12px;overflow:hidden;background:#FFFFFF;border:1px solid #E5E7EB">
<div style="padding:28px 36px;background:#1A2E0A"><span dir="ltr" style="font-weight:700;font-size:20px;letter-spacing:-0.02em"><span style="color:#FFFFFF">Omni</span><span style="color:#97C459">rent</span></span></div>
<div style="padding:36px">${body}</div>
</div>
<p style="text-align:center;font-size:12px;line-height:1.7;color:#6B7280">${footer}</p>
</div></body></html>`;
}

const h1 = (text: string) => `<h1 style="margin:0 0 18px;font-size:24px;font-weight:700">${esc(text)}</h1>`;
const p = (html: string) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#4B5563">${html}</p>`;
const small = (html: string) => `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#4B5563">${html}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:0 0 18px"><a href="${esc(href)}" style="display:inline-block;padding:14px 28px;border-radius:8px;background:#639922;color:#FFFFFF;font-size:16px;font-weight:600;text-decoration:none">${esc(label)}</a></p>`;
const plainLink = (lang: Lang, href: string) =>
  `<div style="padding-top:16px;border-top:1px solid #E5E7EB;font-size:13px;color:#6B7280">${
    lang === "ar" ? "إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:" : "If the button doesn’t work, copy this link into your browser:"
  }<br><span dir="ltr" style="color:#3B6D11;word-break:break-all">${esc(href)}</span></div>`;

// "Your Omnirent contact: Mona Adel · WhatsApp +20 100 000 1234"
function contactLine(lang: Lang, contactName: string, whatsapp: string | null) {
  const ar = lang === "ar";
  const parts = [
    contactName ? esc(contactName) : "",
    whatsapp ? `${ar ? "واتساب" : "WhatsApp"} <span dir="ltr">${esc(whatsapp)}</span>` : "",
  ].filter(Boolean);
  if (parts.length === 0) return "";
  return `<div style="margin:0 0 18px;padding:14px 16px;border-radius:8px;background:#F9FAFB;font-size:14px;color:#374151">${
    ar ? "مسؤول حسابك: " : "Your Omnirent contact: "
  }${parts.join(" · ")}</div>`;
}

export function brokerInviteEmail(opts: {
  lang: Lang;
  to: string;
  firstName: string;
  company: string;
  link: string;
  contactName: string;
  whatsapp: string | null;
}): Email {
  const { lang, to, firstName, company, link, contactName, whatsapp } = opts;
  const ar = lang === "ar";
  const subject = ar ? `عيّن كلمة المرور لحساب ${company} على Omnirent` : `Set your password for ${company} on Omnirent`;
  const html = layout(
    lang,
    h1(ar ? `مرحباً ${firstName}،` : `Hi ${firstName},`) +
      p(
        ar
          ? `شكراً على وقتك في المكالمة. أنشأنا حساب <strong style="color:#111827">${esc(company)}</strong> على Omnirent. عيّن كلمة المرور، ثم أضف عقاراتك وأسعارك لتبدأ البيع على قنواتك.`
          : `Thanks for your time on the call. We’ve set up the <strong style="color:#111827">${esc(company)}</strong> account on Omnirent. Set your password, then add your properties and prices to start selling on your channels.`,
      ) +
      button(link, ar ? "تعيين كلمة المرور" : "Set my password") +
      small(
        ar
          ? 'الرابط صالح لمدة <strong style="color:#111827">7 أيام</strong> ويعمل مرة واحدة.'
          : 'The link works once and expires in <strong style="color:#111827">7 days</strong>.',
      ) +
      contactLine(lang, contactName, whatsapp) +
      plainLink(lang, link),
  );
  const text = ar
    ? `مرحباً ${firstName}،\nأنشأنا حساب ${company} على Omnirent. عيّن كلمة المرور من هذا الرابط (صالح 7 أيام ويعمل مرة واحدة):\n${link}`
    : `Hi ${firstName},\nWe’ve set up the ${company} account on Omnirent. Set your password here (works once, expires in 7 days):\n${link}`;
  return { to, subject, html, text };
}

export function brokerResetEmail(opts: { lang: Lang; to: string; firstName: string; link: string }): Email {
  const { lang, to, firstName, link } = opts;
  const ar = lang === "ar";
  const subject = ar ? "تعيين كلمة مرور جديدة لحسابك على Omnirent" : "Set a new password for your Omnirent account";
  const html = layout(
    lang,
    h1(ar ? `مرحباً ${firstName}،` : `Hi ${firstName},`) +
      p(
        ar
          ? "تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك على Omnirent. اضغط الزر لتعيين كلمة مرور جديدة."
          : "We got a request to reset the password for your Omnirent account. Use the button to set a new one.",
      ) +
      button(link, ar ? "تعيين كلمة مرور جديدة" : "Set a new password") +
      small(
        ar
          ? 'الرابط صالح لمدة <strong style="color:#111827">60 دقيقة</strong> ويعمل مرة واحدة.'
          : 'The link works once and expires in <strong style="color:#111827">60 minutes</strong>.',
      ) +
      small(
        ar
          ? "لم تطلب ذلك؟ تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي."
          : "Didn’t ask for this? Ignore this email and your password stays the same.",
      ) +
      plainLink(lang, link),
  );
  const text = ar
    ? `مرحباً ${firstName}،\nلتعيين كلمة مرور جديدة افتح الرابط (صالح 60 دقيقة ولمرة واحدة):\n${link}`
    : `Hi ${firstName},\nOpen this link to set a new password (works once, expires in 60 minutes):\n${link}`;
  return { to, subject, html, text };
}

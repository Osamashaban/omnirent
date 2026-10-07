// The three emails from the Ops dashboard design, in Arabic and English.
// Styles are inline because email apps ignore stylesheets.

import type { Email } from "./email";
import type { Lang } from "./i18n";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(lang: Lang, body: string) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const footer =
    lang === "ar"
      ? "Omnirent · لوحة العمليات<br>هذه رسالة تلقائية، لا ترد عليها."
      : "Omnirent · Ops dashboard<br>This is an automatic message. Please don't reply.";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><body style="margin:0;background:#F3F4F6;font-family:Outfit,'IBM Plex Sans Arabic',Arial,sans-serif;color:#111827">
<div dir="${dir}" style="max-width:560px;margin:0 auto;padding:24px">
<div style="border-radius:12px;overflow:hidden;background:#FFFFFF;border:1px solid #E5E7EB">
<div style="padding:24px 32px;background:#1A2E0A"><span dir="ltr" style="font-weight:700;font-size:20px"><span style="color:#FFFFFF">Omni</span><span style="color:#97C459">rent</span></span></div>
<div style="padding:32px">${body}</div>
</div>
<p style="text-align:center;font-size:12px;line-height:1.7;color:#6B7280">${footer}</p>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:0 0 20px"><a href="${esc(href)}" style="display:inline-block;padding:14px 28px;border-radius:8px;background:#639922;color:#FFFFFF;font-size:16px;font-weight:600;text-decoration:none">${esc(label)}</a></p>`;

const plainLink = (lang: Lang, href: string) =>
  `<div style="padding-top:16px;border-top:1px solid #E5E7EB;font-size:13px;color:#6B7280">${
    lang === "ar" ? "إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:" : "If the button doesn't work, copy this link into your browser:"
  }<br><span dir="ltr" style="color:#3B6D11;word-break:break-all">${esc(href)}</span></div>`;

const p = (html: string) => `<p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#4B5563">${html}</p>`;
const h1 = (text: string) => `<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">${esc(text)}</h1>`;

export function resetEmail(opts: {
  lang: Lang;
  to: string;
  firstName: string;
  link: string;
  device: string;
  place: string;
  when: string;
}): Email {
  const { lang, to, firstName, link, device, place, when } = opts;
  const ar = lang === "ar";
  const subject = ar ? "إعادة تعيين كلمة مرور لوحة عمليات Omnirent" : "Reset your Omnirent Ops dashboard password";
  const details = [device, place, when].filter(Boolean).map(esc).join("<br>");
  const html = layout(
    lang,
    h1(ar ? `مرحباً ${firstName}،` : `Hi ${firstName},`) +
      p(
        ar
          ? "تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في لوحة عمليات Omnirent. اضغط الزر لتعيين كلمة مرور جديدة."
          : "We got a request to reset the password for your Omnirent Ops dashboard account. Use the button to set a new one.",
      ) +
      button(link, ar ? "تعيين كلمة مرور جديدة" : "Set a new password") +
      p(
        ar
          ? 'ينتهي هذا الرابط خلال <strong style="color:#111827">60 دقيقة</strong> ويعمل مرة واحدة فقط.'
          : 'This link expires in <strong style="color:#111827">60 minutes</strong> and works once.',
      ) +
      `<div style="margin:0 0 20px;padding:14px 16px;border-radius:8px;background:#F9FAFB;border:1px solid #E5E7EB;font-size:13px;line-height:1.7;color:#4B5563"><strong style="color:#111827">${
        ar ? "تفاصيل الطلب" : "Request details"
      }</strong><br>${details}</div>` +
      p(
        ar
          ? "لم تطلب ذلك؟ تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي."
          : "Didn't ask for this? Ignore this email and your password stays the same.",
      ) +
      plainLink(lang, link),
  );
  const text = ar
    ? `مرحباً ${firstName}،\nلتعيين كلمة مرور جديدة افتح الرابط (صالح 60 دقيقة ولمرة واحدة):\n${link}\n\n${[device, place, when].join(" · ")}`
    : `Hi ${firstName},\nOpen this link to set a new password (valid 60 minutes, works once):\n${link}\n\n${[device, place, when].join(" · ")}`;
  return { to, subject, html, text };
}

export function inviteEmail(opts: {
  lang: Lang;
  to: string;
  firstName: string;
  inviterName: string;
  roleName: string;
  link: string;
}): Email {
  const { lang, to, firstName, inviterName, roleName, link } = opts;
  const ar = lang === "ar";
  const subject = ar
    ? `${inviterName} دعاك إلى لوحة عمليات Omnirent`
    : `${inviterName} invited you to the Omnirent Ops dashboard`;
  const html = layout(
    lang,
    h1(ar ? `مرحباً ${firstName}،` : `Hi ${firstName},`) +
      p(
        ar
          ? `أضافك ${esc(inviterName)} إلى لوحة عمليات Omnirent بدور <strong style="color:#111827">${esc(roleName)}</strong>. عيّن كلمة المرور لتبدأ.`
          : `${esc(inviterName)} added you to the Omnirent Ops dashboard as <strong style="color:#111827">${esc(roleName)}</strong>. Set a password to get started.`,
      ) +
      button(link, ar ? "قبول الدعوة" : "Accept invite") +
      p(
        ar
          ? 'الدعوة صالحة لمدة <strong style="color:#111827">7 أيام</strong> وتعمل مرة واحدة.'
          : 'The invite is valid for <strong style="color:#111827">7 days</strong> and works once.',
      ) +
      p(
        ar
          ? "لا تتوقع هذه الدعوة؟ تجاهل الرسالة ولن يُنشأ أي حساب باسمك."
          : "Not expecting this? Ignore this email and no account will be set up for you.",
      ) +
      plainLink(lang, link),
  );
  const text = ar
    ? `مرحباً ${firstName}،\nأضافك ${inviterName} إلى لوحة عمليات Omnirent بدور ${roleName}. لتعيين كلمة المرور افتح الرابط (صالح 7 أيام):\n${link}`
    : `Hi ${firstName},\n${inviterName} added you to the Omnirent Ops dashboard as ${roleName}. Set your password here (valid 7 days):\n${link}`;
  return { to, subject, html, text };
}

export function passwordChangedEmail(opts: { lang: Lang; to: string; firstName: string; when: string }): Email {
  const { lang, to, firstName, when } = opts;
  const ar = lang === "ar";
  const subject = ar ? "تم تغيير كلمة مرور حسابك في Omnirent" : "Your Omnirent password was changed";
  const body = ar
    ? `تم تغيير كلمة مرور حسابك في لوحة عمليات Omnirent (${when}) وتم تسجيل خروجك من جميع الأجهزة. إذا لم تفعل ذلك، تواصل فوراً مع مسؤول النظام في فريقك.`
    : `The password for your Omnirent Ops dashboard account was changed (${when}) and you were signed out of every device. If this wasn't you, contact your team's admin straight away.`;
  return {
    to,
    subject,
    html: layout(lang, h1(ar ? `مرحباً ${firstName}،` : `Hi ${firstName},`) + p(esc(body))),
    text: `${ar ? `مرحباً ${firstName}،` : `Hi ${firstName},`}\n${body}`,
  };
}

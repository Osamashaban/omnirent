// ---------------------------------------------------------------------------
// Sending email (password reset, invites, "your password was changed").
//
// Sent through Resend's web API with a plain fetch, so no extra library is
// needed. Without RESEND_API_KEY nothing is sent: outside production the
// message (including its link) is written to the server log instead, so the
// flows can still be tried on staging; in production the failure is logged
// without the link.
// ---------------------------------------------------------------------------

export type Email = { to: string; subject: string; html: string; text: string };

const DEFAULT_FROM = "Omnirent <no-reply@getomnirent.com>";

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.VERCEL_ENV === "production") {
      console.error(`[email] RESEND_API_KEY is not set; could not send "${email.subject}" to ${email.to}`);
    } else {
      console.log(`[email] (not sent, no RESEND_API_KEY) to=${email.to} subject="${email.subject}"\n${email.text}`);
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!response.ok) {
    console.error(`[email] Resend refused "${email.subject}" to ${email.to}: ${response.status} ${await response.text()}`);
  }
}

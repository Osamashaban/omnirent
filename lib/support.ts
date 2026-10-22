// The Omnirent team's WhatsApp number, shown to brokers in the invite email
// and on the "invite link expired" screen. Set in Vercel as SUPPORT_WHATSAPP
// (e.g. "+20 100 000 1234"). Without it, those places leave the number out.

export function supportWhatsapp(): string | null {
  const value = process.env.SUPPORT_WHATSAPP?.trim();
  return value ? value : null;
}

// wa.me link with a ready-made message, or null without a number.
export function whatsappLink(message: string): string | null {
  const number = supportWhatsapp()?.replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

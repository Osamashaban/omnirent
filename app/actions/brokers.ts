"use server";

// Changes made from Ops › Brokers. Every action checks again that the
// signed-in person's role has the "Brokers" module: hiding a button is not a
// permission check.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { isFlag, isRowId } from "@/lib/action-args";
import { looksLikeEmail, normalizeEmail } from "@/lib/login-rules";
import { BROKER_INVITE_TTL_MS, brokerLinkBase, normalizeMobile, parseApproxUnits } from "@/lib/broker-rules";
import { signOutBrokerEverywhere } from "@/lib/broker-auth";
import { hashSecret, newSecret } from "@/lib/tokens";
import { baseUrl } from "@/lib/request-info";
import { sendEmail } from "@/lib/email";
import { brokerInviteEmail } from "@/lib/broker-emails";
import { supportWhatsapp } from "@/lib/support";
import { getLang } from "@/lib/lang";

async function requireBrokerManager(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.moduleKeys, "brokers")) throw new Error("Not allowed");
  return user;
}

// Creates a fresh 7-day invite link (cancelling older ones) and emails it.
async function sendBrokerInvite(brokerUserId: string, inviter: CurrentUser) {
  const user = await prisma.brokerUser.findUniqueOrThrow({ where: { id: brokerUserId }, include: { broker: true } });
  const now = new Date();
  const secret = newSecret();
  await prisma.$transaction([
    prisma.brokerToken.updateMany({ where: { brokerUserId, type: "INVITE", usedAt: null }, data: { usedAt: now } }),
    prisma.brokerToken.create({
      data: { type: "INVITE", brokerUserId, tokenHash: hashSecret(secret), expiresAt: new Date(now.getTime() + BROKER_INVITE_TTL_MS) },
    }),
    prisma.brokerUser.update({ where: { id: brokerUserId }, data: { invitedAt: now } }),
  ]);
  await sendEmail(
    brokerInviteEmail({
      lang: await getLang(),
      to: user.email,
      firstName: user.name.split(" ")[0],
      company: user.broker.companyName,
      link: `${brokerLinkBase(await baseUrl())}/set-password?token=${secret}`,
      contactName: inviter.name,
      whatsapp: supportWhatsapp(),
    }),
  );
}

export type BrokerFormValues = {
  company: string;
  contact: string;
  mobile: string;
  email: string;
  cityId: string;
  units: string;
  notes: string;
};

export type BrokerFormState = {
  values?: BrokerFormValues;
  errors?: Partial<Record<"company" | "contact" | "mobile" | "email" | "cityId", "required" | "invalid" | "taken">>;
  formError?: true;
  done?: { kind: "added" | "saved"; brokerId: string; company: string; email: string; at: number };
};

export async function saveBroker(_prev: BrokerFormState, form: FormData): Promise<BrokerFormState> {
  const actor = await requireBrokerManager();
  const brokerId = String(form.get("brokerId") ?? "") || null;
  const values: BrokerFormValues = {
    company: String(form.get("company") ?? "").trim().slice(0, 120),
    contact: String(form.get("contact") ?? "").trim().slice(0, 120),
    mobile: String(form.get("mobile") ?? "").trim().slice(0, 30),
    email: normalizeEmail(String(form.get("email") ?? "")).slice(0, 254),
    cityId: String(form.get("cityId") ?? ""),
    units: String(form.get("units") ?? "").trim().slice(0, 10),
    notes: String(form.get("notes") ?? "").trim().slice(0, 2000),
  };
  const errors: NonNullable<BrokerFormState["errors"]> = {};

  const existing = brokerId
    ? await prisma.broker.findUnique({ where: { id: brokerId }, include: { users: { orderBy: { createdAt: "asc" }, take: 1 } } })
    : null;
  if (brokerId && (!existing || existing.users.length === 0)) return { values, formError: true };
  const contactUser = existing?.users[0] ?? null;

  if (!values.company) errors.company = "required";
  if (!values.contact) errors.contact = "required";
  const mobile = normalizeMobile(values.mobile);
  if (!mobile) errors.mobile = "invalid";
  if (!looksLikeEmail(values.email)) errors.email = "invalid";
  else {
    const clash = await prisma.brokerUser.findUnique({ where: { email: values.email } });
    if (clash && clash.id !== contactUser?.id) errors.email = "taken";
  }
  // New brokers pick from the visible cities; an edit may keep a city that
  // has since been hidden.
  const city = isRowId(values.cityId) ? await prisma.city.findUnique({ where: { id: values.cityId }, include: { country: true } }) : null;
  const cityAllowed = city && ((city.visible && city.country.visible) || city.id === existing?.mainCityId);
  if (!cityAllowed) errors.cityId = "required";
  if (Object.keys(errors).length > 0) return { values, errors };

  const data = {
    companyName: values.company,
    mainCityId: values.cityId,
    approxUnits: parseApproxUnits(values.units),
    notes: values.notes || null,
  };

  if (existing && contactUser) {
    await prisma.$transaction([
      prisma.broker.update({ where: { id: existing.id }, data }),
      prisma.brokerUser.update({ where: { id: contactUser.id }, data: { name: values.contact, email: values.email, mobile: mobile! } }),
    ]);
    revalidatePath("/brokers");
    return { done: { kind: "saved", brokerId: existing.id, company: values.company, email: values.email, at: Date.now() } };
  }

  const broker = await prisma.broker.create({
    data: {
      ...data,
      invitedById: actor.id,
      users: { create: { name: values.contact, email: values.email, mobile: mobile!, status: "INVITED" } },
    },
    include: { users: true },
  });
  await sendBrokerInvite(broker.users[0].id, actor);
  revalidatePath("/brokers");
  return { done: { kind: "added", brokerId: broker.id, company: broker.companyName, email: values.email, at: Date.now() } };
}

export type BrokerRowResult = {
  ok: boolean;
  message?: "resent" | "reactivated" | "deactivated";
  company?: string;
  email?: string;
};

async function brokerWithContact(brokerId: unknown) {
  if (!isRowId(brokerId)) return null;
  const broker = await prisma.broker.findUnique({
    where: { id: brokerId },
    include: { users: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  return broker && broker.users[0] ? { broker, user: broker.users[0] } : null;
}

export async function resendBrokerInvite(brokerId: string): Promise<BrokerRowResult> {
  const actor = await requireBrokerManager();
  const found = await brokerWithContact(brokerId);
  if (!found || found.broker.status !== "ACTIVE" || found.user.status !== "INVITED") return { ok: false };
  await sendBrokerInvite(found.user.id, actor);
  revalidatePath("/brokers");
  return { ok: true, message: "resent", company: found.broker.companyName, email: found.user.email };
}

export async function setBrokerActive(brokerId: string, active: boolean): Promise<BrokerRowResult> {
  await requireBrokerManager();
  if (!isFlag(active)) return { ok: false };
  const found = await brokerWithContact(brokerId);
  if (!found) return { ok: false };
  await prisma.broker.update({
    where: { id: found.broker.id },
    data: active ? { status: "ACTIVE", deactivatedAt: null } : { status: "DEACTIVATED", deactivatedAt: new Date() },
  });
  if (!active) await signOutBrokerEverywhere(found.broker.id);
  revalidatePath("/brokers");
  return { ok: true, message: active ? "reactivated" : "deactivated", company: found.broker.companyName, email: found.user.email };
}

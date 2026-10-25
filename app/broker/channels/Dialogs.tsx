"use client";

// The Channels page dialogs, as in the design: connecting Airbnb, the
// connection guide, the imported-bookings summary, Manage, Disconnect,
// pulling Airbnb listings, picking a listing, "Not on it yet?", rate plans,
// syncing that didn't start, unlinking with upcoming bookings, a different
// currency, and the sign-in window for login platforms (VRBO).

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Info, Plus } from "@/components/ops/icons";
import { Copy } from "@/components/broker/property-icons";
import { guideFor, guideSteps, isPropertyLevel, pictureFor, platformById, type Platform } from "@/lib/channel-catalog";
import {
  NO_RATE,
  accountOf,
  checkMarkup,
  connsOf,
  defaultRatePlans,
  linkKey,
  linkedCount,
  markedUp,
  pickList,
  platformState,
  readyMessage,
  type PriceMode,
} from "@/lib/channel-rules";
import type { ConnectResult } from "@/lib/channel-data";
import {
  askHelp,
  connectPlatform,
  disconnect,
  linkUnit,
  pullListings,
  refreshChannels,
  savePrice,
  saveRates,
  startAirbnb,
} from "@/app/actions/channels";
import { CheckIcon, DownloadIcon, ExternalIcon, Modal, Pill, ShieldIcon, Tile, btn, fieldClass } from "./parts";
import type { Ctx, Dlg } from "./types";

const num = (n: number) => n.toLocaleString("en-US");

export function Dialogs({ ctx, dlg }: { ctx: Ctx; dlg: Dlg | null }) {
  if (!dlg) return null;
  const key = JSON.stringify(dlg);
  switch (dlg.k) {
    case "abb":
      return <AbbDialog key={key} ctx={ctx} wait={dlg.wait} />;
    case "guide":
      return <GuideDialog key={key} ctx={ctx} d={dlg} />;
    case "imp":
      return <ImpDialog ctx={ctx} d={dlg} />;
    case "manage":
      return <ManageDialog key={key} ctx={ctx} p={platformById(dlg.p)!} />;
    case "disc":
      return <DiscDialog ctx={ctx} p={platformById(dlg.p)!} blocked={dlg.blocked} />;
    case "pull":
      return <PullDialog ctx={ctx} />;
    case "pick":
      return <PickDialog ctx={ctx} p={platformById(dlg.p)!} u={dlg.u} />;
    case "create":
      return <CreateDialog ctx={ctx} p={platformById(dlg.p)!} u={dlg.u} />;
    case "rates":
      return <RatesDialog key={key} ctx={ctx} p={platformById(dlg.p)!} u={dlg.u} fresh={dlg.fresh} />;
    case "act":
      return <ActDialog ctx={ctx} d={dlg} />;
    case "unblock":
      return <UnblockDialog ctx={ctx} p={platformById(dlg.p)!} u={dlg.u} />;
    case "cur":
      return <CurDialog key={key} ctx={ctx} d={dlg} />;
  }
}

function unitLabel(ctx: Ctx, unitTypeId: string) {
  const u = ctx.data.units.find((x) => x.id === unitTypeId);
  const prop = ctx.data.props.find((x) => x.id === u?.propertyId);
  return { u, prop, full: u ? (prop ? `${prop.name} · ${u.name}` : u.name) : "" };
}

function close(ctx: Ctx) {
  return () => ctx.open(null);
}

// What a connect attempt means for the screen. Returns an error to show in
// the dialog, or null when the dialog moved on.
function afterConnect(ctx: Ctx, p: Platform, r: ConnectResult, propName: string, fields: Record<string, string>, propId: string | null): string | null {
  const { t } = ctx;
  if (r.kind === "connected") {
    ctx.open({ k: "imp", p: p.id, prop: r.propertyId, listings: r.listings, matches: r.matches, bookings: r.bookings });
    return null;
  }
  if (r.kind === "reconnected") {
    ctx.open(null);
    ctx.say(t.toastReconnected(p.name));
    return null;
  }
  if (r.kind === "wait") {
    ctx.open(null);
    ctx.say(r.why === "confirm" ? t.toastConfirmSent(p.name, propName) : r.why === "request" ? t.toastRequest(p.name) : r.why === "cur" ? t.curAsked(p.name, "") : t.toastSupWait(p.name));
    return null;
  }
  if (r.kind === "cur") {
    ctx.open({ k: "cur", p: p.id, prop: propId ?? "", fields, currency: r.currency, own: r.own });
    return null;
  }
  switch (r.error) {
    case "cm":
      return p.id === "bdc" ? t.errCmBdc : t.errCm(p.name);
    case "allConnected":
      return t.errAllConnected;
    case "fill":
      return t.errFill;
    case "reach":
      return t.errReach;
    default:
      return t.failed;
  }
}

// ---------------------------------------------------------------------------
// Airbnb

function AbbDialog({ ctx, wait }: { ctx: Ctx; wait: boolean }) {
  const { t } = ctx;
  const p = platformById("abb")!;
  const [waiting, setWaiting] = useState(wait);
  const was = useRef(platformState(ctx.data, p));

  // While the broker approves on Airbnb (in the other tab), check every few
  // seconds whether Airbnb sent them back.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(async () => {
      const r = await refreshChannels().catch(() => null);
      if (!r || !r.ok) return;
      const st = platformState(r.data, p);
      if (st === "on" && was.current !== "on") {
        clearInterval(id);
        await ctx.run(async () => r);
        const listings = r.data.listings.filter((l) => l.platform === "abb" && !l.gone).length;
        if (was.current === "attn") {
          ctx.open(null);
          ctx.say(t.abbReconnected);
        } else ctx.open({ k: "imp", p: "abb", prop: null, listings, matches: 0, bookings: 0 });
      }
    }, 4000);
    return () => clearInterval(id);
  }, [waiting, ctx, p, t]);

  const go = async () => {
    const win = window.open("about:blank", "_blank");
    const r = await startAirbnb().catch(() => null);
    if (!r || !r.ok) {
      win?.close();
      ctx.say(r && !r.ok && r.error === "noProperty" ? t.abbNoProperty : t.abbCancelled);
      return;
    }
    if (win) win.location.href = r.url;
    else window.location.href = r.url;
    setWaiting(true);
  };

  return (
    <Modal
      title={t.abbTitle}
      onClose={close(ctx)}
      closeLabel={t.close}
      footer={
        <>
          {!waiting && (
            <button type="button" onClick={go} className={`${btn.primary} flex-1`}>
              <ExternalIcon />
              {t.abbGo}
            </button>
          )}
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} ${waiting ? "" : "max-[899px]:hidden"}`}>
            {t.cancel}
          </button>
        </>
      }
    >
      {!waiting ? (
        <>
          <p className="m-0 text-[15px] leading-[1.7] text-[#374151] max-[899px]:text-[14px]">{t.abbIntro}</p>
          <div className="flex flex-col gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
            <span className="text-[14px] font-bold">{t.beforeStart}</span>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px] leading-[1.5]">
              {t.abbReq.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-0.5 flex text-[#15803D]">
                    <CheckIcon size={16} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE4E5] text-[#B42318]">
            <ExternalIcon size={24} />
          </span>
          <span className="text-[17px] font-bold">{t.abbWaitTitle}</span>
          <span className="text-[14px] leading-[1.7] text-[#4B5563]">{t.abbWaitBody}</span>
          <button type="button" onClick={go} className={btn.secondary}>
            {t.abbGo}
          </button>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// The connection guide

function Picture({ ctx, p }: { ctx: Ctx; p: Platform }) {
  const { t } = ctx;
  const pic = pictureFor(p, ctx.lang);
  if (!pic) return null;
  const mark = (n: string) => (
    <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[#DC2626] text-[12px] font-bold text-white shadow-[0_0_0_3px_#FEE2E2]">{n}</span>
  );
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <div role="img" aria-label={t.picAria} className="overflow-hidden rounded-[10px] border border-[#D1D5DB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex h-[30px] items-center gap-2 border-b border-[#E5E7EB] bg-[#F3F4F6] px-2.5">
          <span className="h-2 w-2 rounded-full bg-[#F87171]" />
          <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
          <span className="h-2 w-2 rounded-full bg-[#34D399]" />
          <span className="ms-1.5 text-[12px] font-bold text-[#374151]">{p.name}</span>
          <span className="text-[11px] text-[#6B7280]">{t.picAccount}</span>
        </div>
        <div className="flex flex-col gap-3 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            {mark(pic.m1)}
            {pic.path.map((x, i) => (
              <span key={i} className="contents">
                <span className={i === pic.path.length - 1 ? "font-bold text-[#111827]" : "text-[#6B7280]"}>{x}</span>
                {i < pic.path.length - 1 && <span className="text-[#9CA3AF]">›</span>}
              </span>
            ))}
          </div>
          {pic.kind === "toggle" && (
            <div className="flex items-center gap-2.5 text-[12px]">
              <span className="relative h-[18px] w-[34px] flex-none rounded-full bg-[#2563EB] shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#DC2626]">
                <span className="absolute end-[2px] top-[2px] h-3.5 w-3.5 rounded-full bg-white" />
              </span>
              <span className="font-semibold">{pic.label}</span>
            </div>
          )}
          {pic.kind === "search" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#6B7280]">{pic.label}</span>
              <span dir="ltr" className="flex h-[30px] items-center rounded-md border border-[#9CA3AF] px-2.5 text-[12px]">
                {pic.value}
              </span>
              <div className="flex items-center gap-2 rounded-md bg-[#EFF6FF] px-2.5 py-2 shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#DC2626]">
                <span className="h-3 w-3 flex-none rounded-full border-4 border-[#2563EB]" />
                <span dir="ltr" className="text-[12px] font-bold">
                  {pic.value}
                </span>
              </div>
            </div>
          )}
          {(pic.kind === "select" || pic.kind === "toggle") && (
            <div className="flex flex-col gap-2">
              {(pic.rows ?? []).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2.5 text-[12px]">
                  <span className="flex-[0_0_120px] text-[#374151]">{k}</span>
                  <span className="flex h-[30px] flex-1 items-center justify-between rounded-md border border-[#2563EB] bg-[#EFF6FF] px-2.5 font-bold shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#DC2626]">
                    <span dir="ltr">{v}</span>
                    <span className="text-[#6B7280]">▾</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            {mark(pic.m2)}
            <span className="flex h-[30px] items-center rounded-md bg-[#2563EB] px-3.5 text-[12px] font-bold text-white">{pic.btn}</span>
          </div>
        </div>
      </div>
      <figcaption className="text-[12px] text-[#6B7280]">{t.picCaption}</figcaption>
    </figure>
  );
}

function GuideDialog({ ctx, d }: { ctx: Ctx; d: Extract<Dlg, { k: "guide" }> }) {
  const { t, data, lang } = ctx;
  const p = platformById(d.p)!;
  const g = guideFor(p, lang);
  const steps = guideSteps(p, g, lang);
  const isProp = isPropertyLevel(p);
  const conns = connsOf(data, p.id);
  const free = isProp
    ? data.props.filter((x) => {
        const c = conns.find((c) => c.propertyId === x.id);
        return !c || c.state === "rej" || (c.state === "wait" && c.waitReason === "sup");
      })
    : [];
  const [prop, setProp] = useState<string>(d.prop && free.some((x) => x.id === d.prop) ? d.prop : (free[0]?.id ?? ""));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [vp, setVp] = useState(false);
  const rejected = isProp && prop ? conns.find((c) => c.propertyId === prop && c.state === "rej") : undefined;
  const propName = data.props.find((x) => x.id === prop)?.name ?? "";
  const typed = (g.fields ?? []).some((f) => (fields[f.id] ?? "").trim());
  const filled = (g.fields ?? []).every((f) => (fields[f.id] ?? "").trim());
  const hasMsg = g.t === "sup" || g.t === "unk";
  const message = readyMessage({ platform: p.name, property: isProp ? propName || null : null, pid: fields.pid ?? "", signer: data.signer, company: data.company });

  const label =
    g.t === "ext" ? t.btn.ext : g.t === "login" ? t.btn.login(p.name) : g.t === "request" ? t.btn.request : typed ? t.btn.ext : t.btn.sent;
  const intro =
    g.t === "ext" ? t.gIntro.ext : g.t === "login" ? t.gIntro.login : g.t === "request" ? t.gIntro.request : g.t === "sup" ? t.gIntro.sup(p.name) : g.t === "unk" ? t.gIntro.unk(p.name) : "";

  const go = async () => {
    setErr("");
    if (g.t === "login") return setVp(true);
    if (isProp && !data.props.length) return setErr(t.errNoProps);
    if (isProp && !prop) return setErr(t.errAllConnected);
    const send = g.t === "request" || (g.t === "unk" && !typed) || (g.t === "sup" && !typed) ? {} : fields;
    if (Object.keys(send).length && !filled) return setErr(t.errFill);
    const r = await ctx.run(() => connectPlatform({ platform: p.id, propertyId: isProp ? prop : undefined, fields: send }));
    if (!r) return;
    const e = afterConnect(ctx, p, r.result, propName, send, isProp ? prop : null);
    if (e) setErr(e);
  };
  const help = async () => {
    if (await ctx.run(() => askHelp({ platform: p.id, propertyId: isProp ? prop : undefined }))) ctx.say(t.helpSent);
  };
  const copy = () => {
    navigator.clipboard?.writeText(message).catch(() => undefined);
    ctx.say(t.msgCopied);
  };

  return (
    <>
      <Modal
        title={d.re ? t.gTitleRe(p.name) : isProp ? t.gTitleProp(p.name) : t.gTitle(p.name)}
        onClose={close(ctx)}
        closeLabel={t.close}
        side
        width={560}
        footer={
          <>
            <button type="button" onClick={go} disabled={ctx.busy} className={`${btn.primary} flex-1`}>
              {label}
            </button>
            <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
              {t.cancel}
            </button>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <Tile p={p} />
          <span className="text-[14px] leading-[1.6] text-[#4B5563]">{intro}</span>
        </div>

        {isProp && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-[#C0DD97] bg-[#EAF3DE] p-3.5">
            <label htmlFor="g-prop" className="text-[14px] font-bold text-[#27500A]">
              {t.whichProp}
            </label>
            <select id="g-prop" value={prop} onChange={(e) => setProp(e.target.value)} className={fieldClass}>
              {free.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <span className="text-[13px] leading-[1.5] text-[#3B6D11]">{t.whichPropNote}</span>
          </div>
        )}

        {rejected?.rejectReason && (
          <div role="alert" className="flex gap-2.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[14px] leading-[1.6] text-[#7F1D1D]">
            <span className="mt-0.5 flex text-[#B91C1C]">
              <AlertCircle />
            </span>
            <span>
              <b>{t.declinedLast}</b> {rejected.rejectReason} {t.declinedFix}
            </span>
          </div>
        )}

        {!!g.req?.length && (
          <div className="flex flex-col gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
            <span className="text-[14px] font-bold">{t.checkFirst}</span>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {g.req.map((x) => (
                <li key={x} className="flex gap-2 text-[14px] leading-[1.5]">
                  <span className="mt-0.5 flex text-[#15803D]">
                    <CheckIcon size={16} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        )}

        {steps.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[14px] font-bold">{t.steps}</span>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {steps.map((x, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[#EAF3DE] text-[13px] font-bold text-[#27500A]">{i + 1}</span>
                  <span className="text-[14px] leading-[1.6]">{x}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <Picture ctx={ctx} p={p} />

        {g.idWhere && <span className="text-[13px] text-[#4B5563]">{g.idWhere}</span>}

        {!!g.fields?.length && (
          <div className="flex flex-col gap-3">
            {g.fields.map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <label htmlFor={`gf_${f.id}`} className="text-[14px] font-medium">
                  {f.label}
                </label>
                <input
                  id={`gf_${f.id}`}
                  type={f.type}
                  dir="ltr"
                  value={fields[f.id] ?? ""}
                  maxLength={200}
                  autoComplete={f.type === "password" ? "new-password" : "off"}
                  onChange={(e) => {
                    setFields((x) => ({ ...x, [f.id]: e.target.value }));
                    setErr("");
                  }}
                  placeholder={f.ph}
                  className={`${fieldClass} text-start`}
                />
              </div>
            ))}
          </div>
        )}

        {err && (
          <span role="alert" className="flex items-center gap-1.5 text-[13px] text-[#B91C1C]">
            <AlertCircle size={16} />
            {err}
          </span>
        )}

        {hasMsg && (
          <div className="flex flex-col gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[14px] font-bold">{t.readyMsg}</span>
              <button type="button" onClick={copy} className={`${btn.smallSecondary} h-8 text-[#111827]`}>
                <Copy size={16} />
                {t.copy}
              </button>
            </div>
            <p dir="ltr" lang="en" className="m-0 whitespace-pre-line rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-[13px] leading-[1.6] text-[#374151]">
              {message}
            </p>
            <span className="text-[12px] text-[#6B7280]">{g.email ? t.msgTo(g.email, p.name) : t.msgToChat(p.name)}</span>
          </div>
        )}

        {g.note && (
          <div className="flex gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3 text-[13px] leading-[1.6] text-[#92400E]">
            <Info size={18} className="flex-none" />
            <span>{g.note}</span>
          </div>
        )}

        <button type="button" onClick={help} disabled={ctx.busy} className="cursor-pointer self-start border-0 bg-transparent p-0 text-start text-[14px] font-semibold text-[#3B6D11] underline">
          <span className="max-[899px]:hidden">{t.needHelp}</span>
          <span className="min-[900px]:hidden">{t.needHelpPhone}</span>
        </button>
      </Modal>
      {vp && <SignIn ctx={ctx} p={p} re={!!d.re} onClose={() => setVp(false)} />}
    </>
  );
}

// The sign-in window for login platforms: email and password, then the
// code the platform texts to the account owner.
function SignIn({ ctx, p, re, onClose }: { ctx: Ctx; p: Platform; re: boolean; onClose: () => void }) {
  const { t, data } = ctx;
  const [step, setStep] = useState<"cred" | "busy" | "otp">("cred");
  const [email, setEmail] = useState(accountOf(data, p.id)?.account ?? "");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const attempt = async (withCode?: string) => {
    const r = await connectPlatform({ platform: p.id, login: { email: email.trim(), password: pw, ...(withCode ? { code: withCode } : {}) } }).catch(() => null);
    if (!r || !r.ok) return { kind: "error", error: "failed" } as ConnectResult;
    await ctx.run(async () => r);
    return r.result;
  };
  const done = (r: ConnectResult) => {
    if (r.kind === "connected" || r.kind === "reconnected") {
      onClose();
      afterConnect(ctx, p, r, "", {}, null);
      return true;
    }
    return false;
  };
  const cont = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || !pw) return setErr(t.vpErrFill);
    setErr("");
    setStep("busy");
    const r = await attempt();
    if (done(r)) return;
    if (r.kind === "error" && r.error === "otp") {
      setStep("otp");
      return;
    }
    setStep("cred");
    setErr(r.kind === "error" && r.error === "auth" ? t.vpErrAuth(p.name) : r.kind === "error" && r.error === "allConnected" ? t.errAllConnected : t.failReach);
  };
  const connect = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setErr(t.vpErrCode6);
    setErr("");
    const r = await attempt(code.trim());
    if (done(r)) return;
    if (r.kind === "error" && r.error === "auth") {
      setStep("cred");
      setErr(t.vpErrAuth(p.name));
    } else setErr(r.kind === "error" && r.error === "code" ? t.vpErrCode : t.failReach);
  };
  const resend = async () => {
    setErr("");
    setNote("");
    const r = await attempt();
    if (done(r)) return;
    if (r.kind === "error" && r.error === "otp") setNote(t.vpResent);
    else setErr(t.failReach);
  };

  return (
    <Modal title={t.vpTitle(p.name)} onClose={onClose} closeLabel={t.close} width={440} z={60} head={<Tile p={p} className="max-[899px]:hidden" />}>
      {step === "cred" && (
        <>
          {re && <p className="m-0 text-[13px] leading-[1.6] text-[#374151]">{t.vpReIntro}</p>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vp_em" className="text-[14px] font-medium">
              {t.vpEmail}
            </label>
            <input id="vp_em" type="email" dir="ltr" value={email} onChange={(e) => (setEmail(e.target.value), setErr(""))} placeholder="name@company.com" autoComplete="off" className={`${fieldClass} text-start`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vp_pw" className="text-[14px] font-medium">
              {re ? t.vpNewPw : t.vpPw}
            </label>
            <input id="vp_pw" type="password" dir="ltr" value={pw} onChange={(e) => (setPw(e.target.value), setErr(""))} autoComplete="new-password" className={fieldClass} />
          </div>
          <span className="flex gap-2 text-[12px] leading-[1.5] text-[#4B5563]">
            <ShieldIcon />
            {t.vpSafe}
          </span>
          {err && (
            <span role="alert" className="text-[13px] text-[#B91C1C]">
              {err}
            </span>
          )}
          <button type="button" onClick={cont} className={`${btn.primary} h-[46px] max-[899px]:h-12`}>
            {t.continue}
          </button>
        </>
      )}
      {step === "busy" && (
        <div aria-live="polite" className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#E5E7EB] border-t-[#639922]" />
          <span className="text-[14px] text-[#374151]">{t.vpBusy}</span>
        </div>
      )}
      {step === "otp" && (
        <>
          <p className="m-0 text-[14px] leading-[1.6] text-[#374151]">{t.vpSent(p.name)}</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vp_code" className="text-[14px] font-medium">
              {t.vpCode}
            </label>
            <input
              id="vp_code"
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              value={code}
              onChange={(e) => (setCode(e.target.value.replace(/\D/g, "")), setErr(""))}
              placeholder="123456"
              autoComplete="one-time-code"
              className={`${fieldClass} text-center text-[20px] font-semibold tracking-[6px]`}
            />
          </div>
          {err && (
            <span role="alert" className="text-[13px] text-[#B91C1C]">
              {err}
            </span>
          )}
          {note && <span className="text-[13px] text-[#15803D]">{note}</span>}
          <button type="button" onClick={connect} className={`${btn.primary} h-[46px] max-[899px]:h-12`}>
            {t.vpConnect}
          </button>
          <div className="flex justify-between gap-2">
            <button type="button" onClick={() => (setStep("cred"), setCode(""), setErr(""))} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#4B5563]">
              {t.back}
            </button>
            <button type="button" onClick={resend} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#3B6D11]">
              {t.vpResend}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Connected: what we brought in

function ImpDialog({ ctx, d }: { ctx: Ctx; d: Extract<Dlg, { k: "imp" }> }) {
  const { t, data } = ctx;
  const p = platformById(d.p)!;
  const propName = d.prop ? (data.props.find((x) => x.id === d.prop)?.name ?? "") : "";
  const items = [t.impFound(d.listings), ...(d.bookings ? [t.impBookings(d.bookings)] : []), d.matches ? t.impMatches(d.matches) : t.impNoMatches];
  return (
    <Modal
      title={d.prop ? t.impTitleProp(propName, p.name) : t.impTitle(p.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      footer={
        <>
          {d.matches > 0 && (
            <button
              type="button"
              onClick={() => {
                ctx.open(null);
                ctx.setTab("links");
              }}
              className={`${btn.primary} flex-1`}
            >
              {t.reviewMatches}
            </button>
          )}
          <button type="button" onClick={close(ctx)} className={btn.secondary}>
            {t.done}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <Tile p={p} />
        <span className="text-[14px] text-[#4B5563]">{t.impIntro}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((x) => (
          <li key={x} className="flex gap-2.5 text-[14px] leading-[1.6]">
            <span className="mt-[3px] flex text-[#15803D]">
              <CheckIcon />
            </span>
            {x}
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-[#6B7280]">{t.impNote}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Manage

function ManageDialog({ ctx, p }: { ctx: Ctx; p: Platform }) {
  const { t, data } = ctx;
  const acc = accountOf(data, p.id);
  const st = platformState(data, p);
  const isProp = isPropertyLevel(p);
  const [mode, setMode] = useState<PriceMode>(acc?.priceMode ?? "same");
  const [val, setVal] = useState(acc?.pricePct ? String(acc.pricePct) : "");
  const [err, setErr] = useState("");
  const pct = Number(val) || 0;
  const ex = data.example;
  const save = async () => {
    const m = checkMarkup(mode, mode === "same" ? 0 : Number(val));
    if (!m) return setErr(t.pctErr);
    setErr("");
    const r = await ctx.run(() => savePrice({ platform: p.id, mode: m.mode, pct: m.pct }));
    if (r) ctx.say(m.mode === "same" ? t.priceSame(p.name) : t.priceSaved(p.name));
  };
  const items = isProp
    ? connsOf(data, p.id).map((c) => {
        const prop = data.props.find((x) => x.id === c.propertyId);
        const rate =
          c.exchangeRate && c.currency
            ? c.currency === "USD" && prop?.currency === "EGP"
              ? t.usdLine(c.exchangeRate.toFixed(2))
              : `${c.currency} · 1 ${c.currency} = ${prop?.currency ?? ""} ${c.exchangeRate.toFixed(2)}`
            : "";
        const v = [c.externalId ? t.idOf(c.externalId) : t.waitingId, rate, c.state === "rej" ? (c.rejectReason ?? "") : ""].filter(Boolean).join(" · ");
        const canRetry = c.state === "rej" || (c.state === "wait" && c.waitReason === "sup");
        return { k: prop?.name ?? "", v, st: c.state, retry: canRetry ? () => ctx.open({ k: "guide", p: p.id, prop: c.propertyId }) : null, rLbl: c.state === "rej" ? t.btnTryAgain : t.enterId };
      })
    : acc?.account
      ? [{ k: t.account, v: acc.account, st: null, retry: null, rLbl: "" }]
      : [];
  const accWait = !isProp && st === "wait";

  return (
    <Modal
      title={p.name}
      onClose={close(ctx)}
      closeLabel={t.close}
      side
      width={480}
      footer={
        <>
          <button type="button" onClick={() => ctx.open({ k: "disc", p: p.id, blocked: false })} className={btn.dangerOutline}>
            {t.disconnectPlat}
          </button>
          <span className="flex-1 max-[899px]:hidden" />
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
            {t.close}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <Tile p={p} />
        <span className="flex-1 text-[15px] font-semibold">{t.mCount(linkedCount(data, p.id))}</span>
        <span className="min-[900px]:hidden">
          <Pill st={st} label={t.st[st]} />
        </span>
      </div>

      {accWait && (
        <div className="flex flex-col gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[#FEF3C7] px-3.5 py-3 text-[14px] text-[#92400E]">
          {t.mWait}
          {acc?.waitReason === "unk" && (
            <button
              type="button"
              onClick={() => ctx.open({ k: "guide", p: p.id })}
              className="h-[34px] cursor-pointer self-start rounded-lg border-0 bg-[#639922] px-3 text-[13px] font-semibold text-white"
            >
              {t.enterId}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-[10px] border border-[#E5E7EB] p-3.5">
        <span className="text-[15px] font-bold">{t.priceTitle}</span>
        <span className="text-[13px] leading-[1.6] text-[#4B5563]">{t.priceBody}</span>
        <div role="radiogroup" aria-label={t.priceTitle} className="flex rounded-lg bg-[#F3F4F6] p-[3px]">
          {(
            [
              ["same", t.modeSame],
              ["up", t.modeUp],
              ["down", t.modeDown],
            ] as [PriceMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => (setMode(m), setErr(""))}
              className={`h-[34px] flex-1 cursor-pointer rounded-md border-0 text-[13px] font-semibold ${mode === m ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "bg-transparent text-[#4B5563]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode !== "same" && (
          <div className="relative flex max-w-[160px] items-center">
            <input type="number" inputMode="numeric" min={1} max={50} value={val} onChange={(e) => (setVal(e.target.value), setErr(""))} aria-label={t.percentage} placeholder="15" className={fieldClass} />
            <span className="absolute end-3 text-[14px] text-[#6B7280]">%</span>
          </div>
        )}
        {ex && (
          <span className="text-[13px] text-[#1D4ED8]">
            {t.mkEx(num(ex.price), num(markedUp(ex.price, mode, mode === "same" ? 0 : pct)), p.name, ex.unit, ex.currency)}
          </span>
        )}
        {err && (
          <span role="alert" className="text-[13px] text-[#B91C1C]">
            {err}
          </span>
        )}
        <button type="button" onClick={save} disabled={ctx.busy} className={`${btn.smallPrimary} self-start`}>
          {t.savePrice}
        </button>
      </div>

      {isProp && (
        <>
          <span className="text-[14px] font-bold">{t.propsHere}</span>
          <span className="text-[13px] leading-[1.5] text-[#6B7280]">{t.propsHereBody}</span>
        </>
      )}

      {items.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((mi, i) => (
            <li key={i} className="flex justify-between gap-3 rounded-[10px] border border-[#E5E7EB] px-3.5 py-3 text-[14px]">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">{mi.k}</span>
                <span className="text-[13px] text-[#6B7280]">{mi.v}</span>
              </span>
              <span className="flex flex-none flex-col items-end gap-1.5">
                {mi.st && <span className={`rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${{ on: "bg-[#DCFCE7] text-[#15803D]", wait: "bg-[#FEF3C7] text-[#92400E]", attn: "bg-[#FEE2E2] text-[#B91C1C]", rej: "bg-[#FEE2E2] text-[#B91C1C]", off: "bg-[#F3F4F6] text-[#4B5563]", na: "bg-[#F3F4F6] text-[#9CA3AF]" }[mi.st]}`}>{t.st[mi.st]}</span>}
                {mi.retry && (
                  <button type="button" onClick={mi.retry} className="h-8 cursor-pointer rounded-md border-0 bg-[#639922] px-2.5 text-[12px] font-semibold text-white">
                    {mi.rLbl}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {p.id === "abb" && (
        <button type="button" onClick={() => ctx.open({ k: "pull" })} className={`${btn.secondary} self-start`}>
          <DownloadIcon />
          {t.pullAbb}
        </button>
      )}
      {isProp && (
        <button type="button" onClick={() => ctx.open({ k: "guide", p: p.id })} className={`${btn.secondary} self-start`}>
          <Plus size={16} />
          {t.connectAnother}
        </button>
      )}
    </Modal>
  );
}

function bookingsOn(ctx: Ctx, platform: string, unitTypeId?: string) {
  const { data, t } = ctx;
  const out: string[] = [];
  for (const u of data.units) {
    if (unitTypeId && u.id !== unitTypeId) continue;
    for (const b of data.future[linkKey(u.id, platform)] ?? []) out.push(t.bookingLine(b.code, b.guest, b.arrival, b.departure, b.arrival <= data.today));
  }
  return out;
}

function DiscDialog({ ctx, p, blocked }: { ctx: Ctx; p: Platform; blocked: boolean }) {
  const { t, data } = ctx;
  const fut = bookingsOn(ctx, p.id);
  const isBlocked = blocked || fut.length > 0;
  const go = async () => {
    const r = await ctx.run(() => disconnect({ platform: p.id }));
    if (!r) return;
    if (r.result === "blocked") return ctx.open({ k: "disc", p: p.id, blocked: true });
    ctx.open(null);
    ctx.say(t.disconnected(p.name));
  };
  return (
    <Modal
      title={t.discTitle(p.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      width={460}
      footer={
        <>
          {isBlocked ? (
            <a href="/broker/calendar" className={`${btn.primary} flex-1 no-underline max-[899px]:h-12 max-[899px]:w-full`}>
              {t.openCal}
            </a>
          ) : (
            <button type="button" onClick={go} disabled={ctx.busy} className={`${btn.danger} flex-1`}>
              {t.disconnect}
            </button>
          )}
          <button type="button" onClick={() => ctx.open({ k: "manage", p: p.id })} className={btn.secondary}>
            {t.back}
          </button>
        </>
      }
    >
      {isBlocked ? (
        <>
          <p className="m-0 text-[15px] leading-[1.7] text-[#374151]">{t.discBlocked}</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {fut.map((x, i) => (
              <li key={i} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[14px]">
                {x}
              </li>
            ))}
          </ul>
          <p className="m-0 text-[14px] leading-[1.7] text-[#4B5563]">{t.discAfter}</p>
        </>
      ) : (
        <p className="m-0 text-[15px] leading-[1.7] text-[#374151]">{t.discTxt(p.name, linkedCount(data, p.id))}</p>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Pull listings from Airbnb

function PullDialog({ ctx }: { ctx: Ctx }) {
  const { t, data } = ctx;
  const listings = data.listings.filter((l) => l.platform === "abb" && !l.gone);
  const usedBy = (id: string) => {
    const link = data.links.find((k) => k.platform === "abb" && k.listingId === id);
    return link ? unitLabel(ctx, link.unitTypeId).full : null;
  };
  const fresh = listings.filter((l) => !usedBy(l.id));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const all = fresh.length > 0 && fresh.every((l) => sel.has(l.id));
  const pull = async () => {
    if (!sel.size) return;
    const r = await ctx.run(() => pullListings({ listingIds: [...sel] }));
    if (!r) return;
    ctx.open(null);
    ctx.setTab("links");
    ctx.say(t.pulled(r.n));
  };
  return (
    <Modal
      title={t.pullTitle}
      onClose={close(ctx)}
      closeLabel={t.close}
      side
      width={600}
      footer={
        <>
          <button
            type="button"
            onClick={pull}
            disabled={!sel.size || ctx.busy}
            className={`${btn.primary} flex-1 ${sel.size ? "" : "!cursor-not-allowed !bg-[#E5E7EB] !text-[#6B7280] !opacity-100"}`}
          >
            {sel.size ? t.pullBtn(sel.size) : t.pullFirst}
          </button>
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.pullIntro}</p>
      <div className="flex items-center gap-2.5 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
        <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-[14px] font-semibold">
          <input type="checkbox" checked={all} onChange={(e) => setSel(e.target.checked ? new Set(fresh.map((l) => l.id)) : new Set())} className="h-[18px] w-[18px] accent-[#639922]" />
          {t.selectAllNew}
        </label>
        <span className="text-[13px] text-[#4B5563]">{t.pullCount(listings.length, fresh.length)}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {listings.map((l) => {
          const by = usedBy(l.id);
          return (
            <li key={l.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#E5E7EB] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!!by || sel.has(l.id)}
                  disabled={!!by}
                  onChange={(e) =>
                    setSel((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(l.id);
                      else n.delete(l.id);
                      return n;
                    })
                  }
                  className="h-[18px] w-[18px] flex-none accent-[#639922]"
                />
                <span aria-hidden="true" className="flex h-11 w-14 flex-none items-center justify-center rounded-lg bg-[#FDE2E3] text-[#B42318]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-semibold">{l.name}</span>
                  <span className="text-[12px] text-[#6B7280]">{[l.city, l.guests ? t.guests(l.guests) : ""].filter(Boolean).join(" · ")}</span>
                  <span className={`text-[12px] ${by ? "text-[#6B7280]" : "font-semibold text-[#15803D]"}`}>{by ? t.inOmnirent(by) : t.isNew}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Pick a listing, and "Not on it yet?"

function PickDialog({ ctx, p, u: unitTypeId }: { ctx: Ctx; p: Platform; u: string }) {
  const { t, data } = ctx;
  const { u, full } = unitLabel(ctx, unitTypeId);
  if (!u) return null;
  const list = pickList(data, u, p.id);
  const choose = async (listingId: string, guests: number | null, hasRates: boolean) => {
    const r = await ctx.run(() => linkUnit({ unitTypeId, platform: p.id, listingId }));
    if (!r) return;
    if (r.result !== "ok") return ctx.say(t.failed);
    if (hasRates) return ctx.open({ k: "rates", p: p.id, u: unitTypeId, fresh: true });
    ctx.open(null);
    ctx.say(u.guests && guests && u.guests !== guests ? t.linkedWarn(u.guests, guests, p.name) : t.linked);
  };
  return (
    <Modal
      title={t.pickTitle(full, p.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      footer={
        <button type="button" onClick={close(ctx)} className={`${btn.secondary} flex-1`}>
          {t.cancel}
        </button>
      }
    >
      {list.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map(({ listing: l, usedBy }) => {
            const warn = !usedBy && u.guests && l.guests && u.guests !== l.guests;
            const byLabel = usedBy ? unitLabel(ctx, usedBy.id).full : "";
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => choose(l.id, l.guests, l.rates.length > 0)}
                  disabled={!!usedBy || ctx.busy}
                  className={`flex w-full flex-col items-start gap-0.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3.5 py-3 text-start text-[14px] text-[#111827] ${usedBy ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
                >
                  <span className="font-semibold">{l.name}</span>
                  <span className="text-[12px] text-[#6B7280]">{usedBy ? t.linkedTo(byLabel) : warn ? t.availableWarn(l.guests!, u.guests) : t.available}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-[14px] text-[#4B5563]">{t.noPick}</p>
      )}
    </Modal>
  );
}

function CreateDialog({ ctx, p, u: unitTypeId }: { ctx: Ctx; p: Platform; u: string }) {
  const { t } = ctx;
  const { u, full } = unitLabel(ctx, unitTypeId);
  if (!u) return null;
  const rows: [string, string][] = [
    [t.cName, full],
    [t.cIdentical, String(u.count)],
    [t.cPhotos, t.cPhotosV],
  ];
  const copy = (v: string) => {
    navigator.clipboard?.writeText(v).catch(() => undefined);
    ctx.say(t.copied);
  };
  return (
    <Modal
      title={t.createTitle(full, p.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" onClick={() => ctx.open({ k: "pick", p: p.id, u: unitTypeId })} className={`${btn.primary} flex-1`}>
            {t.linkNow}
          </button>
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
            {t.close}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.createTxt(p.name)}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center gap-3 rounded-[10px] border border-[#E5E7EB] px-3.5 py-3">
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[12px] text-[#6B7280]">{k}</span>
              <span className="text-[14px] font-semibold">{v}</span>
            </span>
            <button
              type="button"
              onClick={() => copy(v)}
              aria-label={t.copy}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#374151]"
            >
              <Copy size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-[#4B5563]">{t.createAfter}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Rate plans

function RatesDialog({ ctx, p, u: unitTypeId, fresh }: { ctx: Ctx; p: Platform; u: string; fresh: boolean }) {
  const { t, data } = ctx;
  const { u, full } = unitLabel(ctx, unitTypeId);
  const link = data.links.find((l) => l.unitTypeId === unitTypeId && l.platform === p.id);
  const listing = link ? data.listings.find((l) => l.id === link.listingId) : undefined;
  const rates = listing?.rates ?? [];
  const [plans, setPlans] = useState<Record<string, string>>(() => (u ? { ...defaultRatePlans(rates, u), ...(link?.ratePlans ?? {}) } : {}));
  const [err, setErr] = useState("");
  if (!u || !link) return null;
  const save = async () => {
    const r = await ctx.run(() => saveRates({ unitTypeId, platform: p.id, plans }));
    if (!r) return;
    if (r.result === "none") return setErr(t.rpErr(p.name));
    if (r.result !== "ok") return setErr(t.failed);
    ctx.open(null);
    ctx.say(t.ratesSaved);
  };
  return (
    <Modal
      title={t.ratesTitle(full, p.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" onClick={save} disabled={ctx.busy} className={`${btn.primary} flex-1`}>
            {t.saveRates}
          </button>
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151] max-[899px]:text-[13px]">{t.ratesIntro}</p>
      {fresh && <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-[13px] text-[#1E3A8A] max-[899px]:text-[12px]">{t.ratesFresh}</div>}
      {rates.map((r) => (
        <div key={r.id} className="flex flex-col gap-1.5 rounded-[10px] border border-[#E5E7EB] px-3.5 py-3">
          <label htmlFor={`rp_${r.id}`} className="text-[14px] font-semibold">
            {r.title}
          </label>
          <select
            id={`rp_${r.id}`}
            value={plans[r.id] ?? NO_RATE}
            onChange={(e) => {
              setPlans((x) => ({ ...x, [r.id]: e.target.value }));
              setErr("");
            }}
            className={fieldClass}
          >
            {u.rates.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            <option value={NO_RATE}>{t.noPrices}</option>
          </select>
        </div>
      ))}
      {err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Syncing didn't start

function ActDialog({ ctx, d }: { ctx: Ctx; d: Extract<Dlg, { k: "act" }> }) {
  const { t, data } = ctx;
  const bad = d.outcomes.filter((o) => !o.ok).length;
  const reason = (o: (typeof d.outcomes)[number], p: Platform) => {
    const e = o.error ?? { code: "reach", msg: "" };
    if (e.code === "unpublished") return [t.failUnpublished, t.failUnpublishedFix];
    if (e.code === "platform") return [e.msg || t.failPlatform(p.name), t.failPlatformFix(p.name)];
    if (e.code === "paused") return [p.id === "abb" ? t.noteAbbAttn : t.noteLoginAttn(p.name), t.btnReconnect];
    return [t.failReach, t.failReachFix];
  };
  const retry = async (linkId: string) => {
    await ctx.sync([linkId], true);
  };
  return (
    <Modal
      title={t.actTitle(bad, d.outcomes.length)}
      onClose={close(ctx)}
      closeLabel={t.close}
      width={560}
      footer={
        <button type="button" onClick={close(ctx)} className={`${btn.secondary} flex-1`}>
          {t.close}
        </button>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.actIntro}</p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {d.outcomes.map((o) => {
          const p = platformById(o.platform)!;
          const live = data.links.find((l) => l.id === o.linkId)?.syncOn ?? o.ok;
          const [why, fix] = reason(o, p);
          return (
            <li key={o.linkId} className="flex flex-col gap-2 rounded-[10px] border border-[#E5E7EB] px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <Tile p={p} size={28} radius={6} font={12} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-semibold">{unitLabel(ctx, o.unitTypeId).full}</span>
                  <span className="text-[12px] text-[#6B7280]">{p.name}</span>
                </span>
                <span className={`text-[13px] font-bold ${live ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{live ? t.actLive : t.actNot}</span>
              </div>
              {!live && (
                <div className="flex flex-col gap-1.5 rounded-lg bg-[#FEF2F2] px-3 py-2.5 text-[13px] leading-[1.6]">
                  <span className="text-[#7F1D1D]">
                    <b>{t.why}</b> {why}
                  </span>
                  <span className="text-[#374151]">
                    <b>{t.howFix}</b> {fix}
                  </span>
                  <button
                    type="button"
                    onClick={() => (o.error?.code === "paused" ? ctx.open(p.how === "account" ? { k: "abb", wait: false } : { k: "guide", p: p.id, re: true }) : retry(o.linkId))}
                    disabled={ctx.busy}
                    className="h-[34px] cursor-pointer self-start rounded-md border-0 bg-[#639922] px-3 text-[13px] font-semibold text-white"
                  >
                    {o.error?.code === "paused" ? t.btnReconnect : t.tryAgain}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Can't unlink yet

function UnblockDialog({ ctx, p, u: unitTypeId }: { ctx: Ctx; p: Platform; u: string }) {
  const { t } = ctx;
  const { u } = unitLabel(ctx, unitTypeId);
  const list = bookingsOn(ctx, p.id, unitTypeId);
  if (!u) return null;
  return (
    <Modal
      title={t.unTitle(u.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      footer={
        <>
          <a href="/broker/calendar" className={`${btn.primary} flex-1 no-underline max-[899px]:h-12 max-[899px]:w-full`}>
            {t.openCal}
          </a>
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
            {t.close}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px] leading-[1.7] text-[#374151] max-[899px]:text-[14px]">{t.unTxt(p.name)}</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {list.map((x, i) => (
          <li key={i} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[14px]">
            {x}
          </li>
        ))}
      </ul>
      <span className="text-[14px] font-bold">{t.toUnlink}</span>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {t.unSteps(p.name).map((x, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-[1.6]">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#EAF3DE] text-[12px] font-bold text-[#27500A]">{i + 1}</span>
            <span>{x}</span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// A different currency on the platform

function CurDialog({ ctx, d }: { ctx: Ctx; d: Extract<Dlg, { k: "cur" }> }) {
  const { t, data } = ctx;
  const p = platformById(d.p)!;
  const propName = data.props.find((x) => x.id === d.prop)?.name ?? "";
  const [mode, setMode] = useState<"ask" | "conv">("ask");
  const [rate, setRate] = useState("");
  const [err, setErr] = useState("");
  const base = data.example?.price ?? 1000;
  const r = Number(rate);
  const go = async () => {
    if (mode === "conv" && !(r > 0)) return setErr(t.curErr);
    setErr("");
    const res = await ctx.run(() => connectPlatform({ platform: p.id, propertyId: d.prop, fields: d.fields, currency: mode === "ask" ? { mode: "ask" } : { mode: "conv", rate: r } }));
    if (!res) return;
    if (res.result.kind === "wait" && res.result.why === "cur") {
      ctx.open(null);
      ctx.say(t.curAsked(p.name, d.own));
      return;
    }
    const e = afterConnect(ctx, p, res.result, propName, d.fields, d.prop);
    if (e) setErr(e);
  };
  const choice = (on: boolean) => (on ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white");
  return (
    <Modal
      title={t.curTitle(propName, p.name)}
      onClose={close(ctx)}
      closeLabel={t.close}
      width={540}
      footer={
        <>
          <button type="button" onClick={go} disabled={ctx.busy} className={`${btn.primary} flex-1`}>
            {t.continue}
          </button>
          <button type="button" onClick={close(ctx)} className={`${btn.secondary} max-[899px]:hidden`}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px] leading-[1.7] text-[#374151] max-[899px]:text-[14px]">{t.curTxt(p.name, d.own, d.currency)}</p>
      <div role="radiogroup" aria-label={t.curAria} className="flex flex-col gap-2.5">
        <button type="button" role="radio" aria-checked={mode === "ask"} onClick={() => setMode("ask")} className={`flex cursor-pointer flex-col items-start gap-1 rounded-[10px] p-3.5 text-start text-[14px] text-[#111827] ${choice(mode === "ask")}`}>
          <span className="font-bold">{t.curAsk(d.own)}</span>
          <span className="text-[13px] leading-[1.6] text-[#4B5563]">{t.curAskBody}</span>
        </button>
        <button type="button" role="radio" aria-checked={mode === "conv"} onClick={() => setMode("conv")} className={`flex cursor-pointer flex-col items-start gap-1 rounded-[10px] p-3.5 text-start text-[14px] text-[#111827] ${choice(mode === "conv")}`}>
          <span className="font-bold">{t.curConv(d.currency)}</span>
          <span className="text-[13px] leading-[1.6] text-[#4B5563]">{t.curConvBody(d.currency)}</span>
        </button>
      </div>
      {mode === "conv" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cur_rate" className="text-[14px] font-medium">
            {t.curRate(d.own, d.currency)}
          </label>
          <input id="cur_rate" type="number" inputMode="decimal" dir="ltr" value={rate} onChange={(e) => (setRate(e.target.value), setErr(""))} className={`${fieldClass} max-w-[200px]`} />
          {r > 0 && <span className="text-[13px] text-[#1D4ED8]">{t.curEx(num(base), (base / r).toFixed(2), p.name, d.own, d.currency)}</span>}
        </div>
      )}
      {err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
    </Modal>
  );
}

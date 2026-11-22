"use client";

// The broker Guests page (design App_Bookings v87, the Guests boards;
// GuestPhList and GuestPhProfile on phones): tag chips, search, the guest
// table (a list on phones), the guest profile with its stays, and the
// Don't rent, merge, delete and ID document dialogs.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import type { BookingsData, GuestView } from "@/lib/booking-data";
import { DOC_TYPES, telLink, toCsv, waLink, type DocType, type GuestTag } from "@/lib/booking-rules";
import { countryName, type BookingDict } from "@/lib/booking-i18n";
import { deleteGuestPersonalData, mergeGuestProfiles, saveGuestDocument, saveGuestNotes, tagGuest } from "@/app/actions/bookings";
import { Toast } from "@/components/ops/Overlay";
import { Ban, Chat, Download, IdCard, Lock, Merge, Phone, Plus, Trash, Users } from "@/components/broker/booking-icons";
import { Banner, Dialog, Field, GuestAvatar, PILL, Pill, SearchBox, SidePanel, Tile, bbtn, fieldBase, fieldBorder, textareaClass } from "@/components/broker/booking-ui";
import { useBookings, type BookingsCtx } from "../bookings/useBookings";
import { datesText, download, guestIni, statsFor, tagsOf, type GuestStats } from "../bookings/view";

type Chip = "all" | GuestTag | "dup";
const CHIPS: Chip[] = ["all", "repeat", "vip", "blocked", "dup"];
type GDlg = "block" | "merge" | "del" | "delBlocked" | "doc";

export function GuestsApp({ lang, data: initial }: { lang: Lang; data: BookingsData }) {
  const ctx = useBookings(lang, initial);
  const { t, data, stats } = ctx;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [chip, setChip] = useState<Chip>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const open = params.get("open");
    if (!open) return;
    if (data.guests.some((g) => g.id === open)) setOpenId(open);
    router.replace(path, { scroll: false });
  }, [params, data.guests, path, router]);

  const list = useMemo(() => data.guests.map((g) => ({ g, s: statsFor(stats, g.id), tags: tagsOf(g, statsFor(stats, g.id)) })), [data.guests, stats]);
  const count = (c: Chip) => list.filter((x) => c === "all" || (c === "dup" ? Boolean(x.g.dupOf) : x.tags.includes(c))).length;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return list
      .filter((x) => chip === "all" || (chip === "dup" ? Boolean(x.g.dupOf) : x.tags.includes(chip)))
      .filter(
        (x) =>
          !needle ||
          x.g.name.toLowerCase().includes(needle) ||
          x.g.email.toLowerCase().includes(needle) ||
          (digits.length >= 3 && x.g.phone.replace(/\D/g, "").includes(digits)),
      )
      .sort((a, b) => (b.s.last?.arrival ?? "").localeCompare(a.s.last?.arrival ?? "") || a.g.name.localeCompare(b.g.name));
  }, [list, chip, q]);

  const exportCsv = useCallback(() => {
    const out = rows.map(({ g, s, tags }) => [
      g.name,
      g.phone,
      g.email,
      countryName(t, g.country),
      s.n,
      s.nights,
      s.spent,
      s.last ? s.last.arrival : "",
      [...tags.map((x) => t.tagLabel[x]), ...(g.dupOf ? [t.possibleDup] : [])].join(" · "),
    ]);
    download(`guests-${data.today}.csv`, toCsv(t.guestsHeader, out));
  }, [rows, t, data.today]);

  const open = openId ? data.guests.find((g) => g.id === openId) : undefined;
  const empty = data.guests.length === 0;

  return (
    <main className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-3 py-3 min-[900px]:gap-[18px] min-[900px]:px-9 min-[900px]:pb-9 min-[900px]:pt-6">
      <div className="hidden flex-wrap items-end gap-4 min-[900px]:flex">
        <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold">{t.guests}</h1>
          <p className="m-0 text-[15px] text-[#4B5563]">{t.guestsIntro}</p>
        </div>
        {!empty && (
          <button type="button" onClick={exportCsv} className={bbtn.secondary}>
            <Download />
            {t.export}
          </button>
        )}
      </div>

      {empty ? (
        <div className="mx-4 flex flex-col items-center gap-3 px-2 py-12 text-center min-[900px]:mx-0 min-[900px]:rounded-xl min-[900px]:border min-[900px]:border-dashed min-[900px]:border-[#E5E7EB] min-[900px]:bg-white min-[900px]:px-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Users size={26} />
          </span>
          <h2 className="m-0 text-[20px] font-bold">{t.noGuestsTitle}</h2>
          <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noGuestsBody}</p>
        </div>
      ) : (
        <>
          <SearchBox value={q} onChange={setQ} label={t.ph.searchGuests} className="mx-4 min-[900px]:hidden" />
          <div className="flex flex-wrap items-center gap-2.5 max-[899px]:px-4">
            <div role="radiogroup" aria-label={t.tags} className="flex gap-1.5 max-[899px]:gap-2 max-[899px]:overflow-x-auto min-[900px]:flex-wrap">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={chip === c}
                  onClick={() => setChip(c)}
                  className={`inline-flex h-[34px] flex-none cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
                    chip === c
                      ? "max-[899px]:border-0 max-[899px]:bg-[#27500A] max-[899px]:text-white min-[900px]:border-[1.5px] min-[900px]:border-[#639922] min-[900px]:bg-[#EAF3DE] min-[900px]:text-[#27500A]"
                      : "border border-[#D1D5DB] bg-white text-[#374151]"
                  }`}
                >
                  {t.chips[c]}
                  <span className="text-[11px] opacity-80 min-[900px]:hidden">{count(c)}</span>
                </button>
              ))}
            </div>
            <SearchBox value={q} onChange={setQ} label={t.searchGuests} className="ms-auto hidden flex-[0_1_320px] min-[900px]:flex" />
          </div>

          {rows.length ? (
            <>
              <GuestTable t={t} rows={rows} openId={openId} onOpen={setOpenId} />
              <ul className="m-0 mt-1 list-none p-0 min-[900px]:hidden">
                {rows.map(({ g, s, tags }) => (
                  <li key={g.id}>
                    <button type="button" onClick={() => setOpenId(g.id)} className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[#F3F4F6] bg-white px-4 py-3 text-start text-[#111827]">
                      <GuestAvatar ini={guestIni(g.name)} size={40} />
                      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="truncate text-[15px] font-semibold">{g.name}</span>
                        <span dir="auto" className="text-[12px] text-[#6B7280]">
                          {g.phone || t.noNumber}
                        </span>
                        {(tags.length > 0 || g.dupOf) && (
                          <span className="flex flex-wrap gap-1">
                            {tags.map((x) => (
                              <Pill key={x} tone={x}>
                                {t.tagLabel[x]}
                              </Pill>
                            ))}
                            {g.dupOf && <Pill tone="dup">{t.possibleDup}</Pill>}
                          </span>
                        )}
                      </span>
                      <span className="whitespace-nowrap text-end text-[12px] text-[#6B7280]">{s.current ? t.stage[s.current.stage] : s.n ? t.ph.staysN(s.n) : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mx-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center min-[900px]:mx-0">
              <span className="text-[15px] text-[#4B5563]">{t.noGuestsMatch}</span>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setChip("all");
                }}
                className={bbtn.secondary}
              >
                {t.clearSearch}
              </button>
            </div>
          )}
        </>
      )}

      {open && <GuestProfile ctx={ctx} g={open} s={statsFor(stats, open.id)} onClose={() => setOpenId(null)} onOpen={setOpenId} />}
      {ctx.toast && (
        <Toast onClose={ctx.closeToast} closeLabel={t.close} place="content">
          {ctx.toast}
        </Toast>
      )}
    </main>
  );
}

const th = "whitespace-nowrap border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]";
const td = "border-b border-[#F3F4F6] px-4 py-3 align-middle text-[14px]";

function GuestTable({ t, rows, openId, onOpen }: { t: BookingDict; rows: { g: GuestView; s: GuestStats; tags: GuestTag[] }[]; openId: string | null; onOpen: (id: string) => void }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white min-[900px]:block">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr>
            <th className={th}>{t.gCols.guest}</th>
            <th className={th}>{t.gCols.contact}</th>
            <th className={`${th} text-center`}>{t.gCols.stays}</th>
            <th className={`${th} text-center`}>{t.gCols.nights}</th>
            <th className={th}>{t.gCols.spent}</th>
            <th className={th}>{t.gCols.last}</th>
            <th className={th}>{t.gCols.tags}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ g, s, tags }) => (
            <tr
              key={g.id}
              tabIndex={0}
              onClick={() => onOpen(g.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(g.id)}
              className={`cursor-pointer hover:bg-[#F9FAFB] ${openId === g.id ? "bg-[#F7FBF1]" : ""}`}
            >
              <td className={td}>
                <div className="flex items-center gap-2.5">
                  <GuestAvatar ini={guestIni(g.name)} />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-[12px] text-[#6B7280]">{countryName(t, g.country)}</span>
                  </div>
                </div>
              </td>
              <td className={td}>
                <div className="flex flex-col gap-0.5">
                  <span dir="ltr" className={`text-start ${g.phone ? "text-[#111827]" : "text-[#9CA3AF]"}`}>
                    {g.phone || t.noNumber}
                  </span>
                  <span dir="auto" className="text-[12px] text-[#6B7280]">
                    {g.email || (g.emailKind === "hidden" ? t.emailHidden : t.noEmail)}
                  </span>
                </div>
              </td>
              <td className={`${td} text-center`}>{s.n}</td>
              <td className={`${td} text-center`}>{s.nights}</td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{t.money(s.spent, s.last?.currency ?? "EGP")}</td>
              <td className={`${td} whitespace-nowrap`}>{s.last ? t.day(s.last.arrival) : t.noStays}</td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {tags.map((x) => (
                    <Pill key={x} tone={x}>
                      {t.tagLabel[x]}
                    </Pill>
                  ))}
                  {g.dupOf && <Pill tone="dup">{t.possibleDup}</Pill>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 text-[13px] text-[#6B7280]">{t.guestsCount(rows.length)}</div>
    </div>
  );
}

function GuestProfile({ ctx, g, s, onClose, onOpen }: { ctx: BookingsCtx; g: GuestView; s: GuestStats; onClose: () => void; onOpen: (id: string) => void }) {
  const { t, data } = ctx;
  const [dlg, setDlg] = useState<GDlg | null>(null);
  const [note, setNote] = useState(g.note);
  useEffect(() => setNote(g.note), [g.id, g.note]);
  const tags = tagsOf(g, s);
  const dup = g.dupOf ? data.guests.find((x) => x.id === g.dupOf) : undefined;
  const dupPlatform = dup ? (data.bookings.find((b) => b.guestId === dup.id)?.platformName ?? "") : "";
  const stays = [...s.all].sort((a, b) => b.arrival.localeCompare(a.arrival));

  const toggle = async (tag: "vip" | "blocked", on: boolean) => {
    if (tag === "blocked" && on) return setDlg("block");
    const r = await ctx.run(() => tagGuest(g.id, tag, on));
    if (r && !r.ok) ctx.say(t.err.generic);
  };
  const saveNote = async () => {
    if (note === g.note) return;
    const r = await ctx.run(() => saveGuestNotes(g.id, note));
    if (r?.ok) ctx.say(t.toast.guestNote);
    else if (r) ctx.say(t.err.generic);
  };

  return (
    <>
      <SidePanel
        label={g.name}
        width={600}
        phoneTitle={g.name}
        onClose={onClose}
        closeLabel={t.close}
        backLabel={t.back}
        head={
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="m-0 text-[21px] font-bold">{g.name}</h2>
            {g.country && <span className="text-[13px] text-[#6B7280]">{countryName(t, g.country)}</span>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((x) => (
                  <Pill key={x} tone={x}>
                    {t.tagLabel[x]}
                  </Pill>
                ))}
              </div>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5 min-[900px]:hidden">
          {g.country && <span className="text-[13px] text-[#6B7280]">{countryName(t, g.country)}</span>}
          {tags.map((x) => (
            <Pill key={x} tone={x}>
              {t.tagLabel[x]}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {g.phone && !g.deleted && (
            <>
              <a href={telLink(g.phone)} className={`${bbtn.sSecondary} max-[899px]:h-11 max-[899px]:flex-1 max-[899px]:text-[15px]`}>
                <Phone />
                {t.call}
              </a>
              <a href={waLink(g.phone)} target="_blank" rel="noopener noreferrer" className={`${bbtn.sWhatsapp} max-[899px]:h-11 max-[899px]:flex-1 max-[899px]:text-[15px]`}>
                <Chat />
                {t.whatsapp}
              </a>
            </>
          )}
          {!g.deleted && (
            <Link href={`/broker/bookings?new=1&guest=${encodeURIComponent(g.id)}`} className={`${bbtn.sPrimary} max-[899px]:h-11 max-[899px]:w-full max-[899px]:text-[15px]`}>
              <Plus size={15} />
              {t.newForGuest}
            </Link>
          )}
        </div>

        {g.blocked && (
          <Banner tone="redSoft" role="alert" icon={<Ban size={18} />}>
            <b>{t.dontRentBanner}</b> {g.blockReason}
          </Banner>
        )}
        {dup && (
          <div className="flex items-center gap-3 rounded-[10px] border border-[#E9D5FF] bg-[#FAF5FF] px-3.5 py-3 text-[14px] leading-[1.6] text-[#581C87] max-[899px]:text-[13px]">
            <Merge />
            <span className="flex-1">
              <span className="max-[899px]:hidden">{t.dupTxt(dup.name, dupPlatform || "-")}</span>
              <span className="min-[900px]:hidden">{t.ph.dupShort(dup.name)}</span>
            </span>
            <button type="button" onClick={() => setDlg("merge")} className={bbtn.sPurple}>
              <span className="max-[899px]:hidden">{t.merge}</span>
              <span className="min-[900px]:hidden">{t.ph.merge}</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2.5 max-[899px]:grid-cols-3">
          <Stat k={t.kStays} v={String(s.n)} size={20} />
          <Stat k={t.kNights} v={String(s.nights)} size={20} />
          <Stat k={t.kSpent} kPhone={t.ph.spent} v={t.money(s.spent, s.last?.currency ?? "EGP")} size={16} />
          <div className="max-[899px]:hidden">
            <Stat k={t.kPlatforms} v={s.platforms.join(" · ") || t.none} size={13} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[14px] font-bold min-[900px]:text-[15px]">{t.contact}</h3>
          <Row k={t.mobile} v={g.phone || t.noPhone} ltr={Boolean(g.phone)} />
          <Row k={t.email} v={g.email || (g.emailKind === "hidden" ? t.emailHiddenBy : t.noEmailLong)} ltr={Boolean(g.email)} />
          {g.emailKind === "alias" && (
            <span className="text-[12px] text-[#6B7280]">
              <span className="max-[899px]:hidden">{t.relayNote}</span>
              <span className="min-[900px]:hidden">{t.ph.relay}</span>
            </span>
          )}
          <div className="flex items-center gap-3 text-[14px]">
            <span className="flex-[0_0_90px] text-[#6B7280]">{t.idDoc}</span>
            <span className="flex-1 font-medium">{g.docNumber ? `${t.docType[g.docType as DocType] ?? g.docType} · ${g.docNumber}` : t.notAdded}</span>
            {!g.deleted && (
              <button type="button" onClick={() => setDlg("doc")} className={bbtn.link}>
                <IdCard />
                <span className="max-[899px]:hidden">{t.addEdit}</span>
                <span className="min-[900px]:hidden">{t.ph.add}</span>
              </button>
            )}
          </div>
        </div>

        {!g.deleted && (
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[14px] font-bold min-[900px]:text-[15px]">{t.tags}</h3>
            <div className="flex flex-wrap gap-2">
              {(["vip", "blocked"] as const).map((tag) => {
                const on = g[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={ctx.busy}
                    onClick={() => toggle(tag, !on)}
                    className={`h-[34px] cursor-pointer rounded-full px-3 text-[13px] font-semibold ${on ? `${PILL[tag]} border border-transparent` : "border border-dashed border-[#D1D5DB] bg-white text-[#374151]"}`}
                  >
                    {t.tagLabel[tag]}
                  </button>
                );
              })}
            </div>
            <span className="text-[12px] text-[#6B7280]">{t.tagsHint}</span>
          </div>
        )}

        {!g.deleted && (
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[14px] font-bold min-[900px]:text-[15px]">{t.teamNotes}</h3>
            <textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} aria-label={t.teamNotes} placeholder={t.teamNotesPh} className={textareaClass} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[14px] font-bold min-[900px]:text-[15px]">{t.staysTitle}</h3>
          {stays.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {stays.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/broker/bookings?open=${encodeURIComponent(b.id)}`}
                    className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-start text-[14px] text-[#111827] no-underline"
                  >
                    <Tile color={b.color} ini={b.ini} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-semibold">{b.unitName && b.unitName !== "-" ? `${b.propertyName} · ${b.unitName}` : b.propertyName}</span>
                      <span className="text-[12px] text-[#6B7280]">{datesText(t, b.arrival, b.departure)}</span>
                    </span>
                    <Pill tone={b.status === "canc" ? "canc" : b.status === "pend" ? "pend" : "stage"}>{b.status === "canc" ? t.st.canc : t.stage[b.stage]}</Pill>
                    <span className="whitespace-nowrap font-semibold max-[899px]:hidden">{t.money(b.total, b.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[13px] text-[#6B7280]">{t.noStays}</span>
          )}
        </div>

        {!g.deleted && (
          <div className="flex flex-col gap-1.5 border-t border-[#E5E7EB] pt-3">
            <button type="button" onClick={() => setDlg(s.upcoming.length ? "delBlocked" : "del")} className={`${bbtn.sDanger} self-start`}>
              <Trash />
              {t.deleteData}
            </button>
            <span className="text-[12px] text-[#6B7280]">{t.deleteHint}</span>
          </div>
        )}
      </SidePanel>

      {dlg === "block" && <BlockDialog ctx={ctx} g={g} onClose={() => setDlg(null)} />}
      {dlg === "merge" && dup && <MergeDialog ctx={ctx} a={g} b={dup} onClose={() => setDlg(null)} onMerged={onOpen} />}
      {dlg === "del" && <DeleteDialog ctx={ctx} g={g} onClose={() => setDlg(null)} onBlocked={() => setDlg("delBlocked")} />}
      {dlg === "delBlocked" && (
        <Dialog
          title={t.delBlockedTitle}
          onClose={() => setDlg(null)}
          closeLabel={t.close}
          footer={
            <button type="button" onClick={() => setDlg(null)} className={`${bbtn.secondary} flex-1`}>
              {t.ok}
            </button>
          }
        >
          <p className="m-0 text-[15px] leading-[1.7] text-[#374151]">{t.delBlockedBody}</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {s.upcoming.map((b) => (
              <li key={b.id} dir="auto" className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[14px]">
                {b.code} · {datesText(t, b.arrival, b.departure)}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {dlg === "doc" && <DocDialog ctx={ctx} g={g} onClose={() => setDlg(null)} />}
    </>
  );
}

function Stat({ k, kPhone, v, size }: { k: string; kPhone?: string; v: string; size: number }) {
  return (
    <div className="flex h-full flex-col gap-0.5 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <span className="text-[12px] text-[#6B7280]">
        <span className={kPhone ? "max-[899px]:hidden" : ""}>{k}</span>
        {kPhone && <span className="min-[900px]:hidden">{kPhone}</span>}
      </span>
      <span className="break-words font-bold max-[899px]:text-[15px]" style={{ fontSize: size }}>
        {v}
      </span>
    </div>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr: boolean }) {
  return (
    <div className="flex gap-3 text-[14px]">
      <span className="flex-[0_0_90px] text-[#6B7280]">{k}</span>
      <span dir={ltr ? "ltr" : "auto"} className={`min-w-0 break-words font-medium ${ltr ? "text-start" : "text-[#6B7280]"}`}>
        {v}
      </span>
    </div>
  );
}

function BlockDialog({ ctx, g, onClose }: { ctx: BookingsCtx; g: GuestView; onClose: () => void }) {
  const { t } = ctx;
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");
  const go = async () => {
    if (!why.trim()) return setErr(t.err.block);
    const r = await ctx.run(() => tagGuest(g.id, "blocked", true, why));
    if (!r) return;
    if (r.ok) {
      ctx.say(t.toast.blocked);
      onClose();
    } else setErr(r.error === "reason" ? t.err.block : t.err.generic);
  };
  return (
    <Dialog
      title={t.blockTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.dangerSolid} flex-1`}>
            {t.saveTag}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.blockIntro}</p>
      <textarea value={why} maxLength={300} onChange={(e) => setWhy(e.target.value)} aria-label={t.reason} className={textareaClass} />
      {err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
    </Dialog>
  );
}

function MergeDialog({ ctx, a, b, onClose, onMerged }: { ctx: BookingsCtx; a: GuestView; b: GuestView; onClose: () => void; onMerged: (id: string) => void }) {
  const { t } = ctx;
  const [keep, setKeep] = useState(a.id);
  const go = async () => {
    const drop = keep === a.id ? b.id : a.id;
    const r = await ctx.run(() => mergeGuestProfiles(keep, drop));
    if (!r) return;
    if (r.ok) {
      ctx.say(t.toast.merged((keep === a.id ? a : b).name));
      onClose();
      onMerged(keep);
    } else ctx.say(t.err.generic);
  };
  return (
    <Dialog
      title={t.mergeTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.primary} flex-1`}>
            {t.mergeGo}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.mergeIntro}</p>
      <div role="radiogroup" aria-label={t.mergeTitle} className="flex flex-col gap-2">
        {[a, b].map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={keep === x.id}
            onClick={() => setKeep(x.id)}
            className={`cursor-pointer rounded-[10px] px-3.5 py-3 text-start text-[14px] font-semibold text-[#111827] ${keep === x.id ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#D1D5DB] bg-white"}`}
          >
            {x.name} · {x.email || t.noEmail}
          </button>
        ))}
      </div>
    </Dialog>
  );
}

function DeleteDialog({ ctx, g, onClose, onBlocked }: { ctx: BookingsCtx; g: GuestView; onClose: () => void; onBlocked: () => void }) {
  const { t } = ctx;
  const go = async () => {
    const r = await ctx.run(() => deleteGuestPersonalData(g.id));
    if (!r) return;
    if (r.ok) {
      ctx.say(t.toast.deleted);
      onClose();
    } else if (r.error === "upcoming") onBlocked();
    else ctx.say(t.err.generic);
  };
  return (
    <Dialog
      title={t.delTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.dangerSolid} flex-1`}>
            {t.delGo}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px] leading-[1.7] text-[#374151]">{t.delBody}</p>
    </Dialog>
  );
}

function DocDialog({ ctx, g, onClose }: { ctx: BookingsCtx; g: GuestView; onClose: () => void }) {
  const { t } = ctx;
  const [type, setType] = useState<DocType>((DOC_TYPES as readonly string[]).includes(g.docType) ? (g.docType as DocType) : "nid");
  const [number, setNumber] = useState(g.docNumber);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!number.trim()) return setErr(t.err.dn);
    const r = await ctx.run(() => saveGuestDocument(g.id, type, number));
    if (!r) return;
    if (r.ok) {
      ctx.say(t.toast.doc);
      onClose();
    } else setErr(r.error === "number" ? t.err.dn : t.err.generic);
  };
  return (
    <Dialog
      title={t.docTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.primary} flex-1`}>
            {t.save}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <Field id="dt" label={t.typeLbl}>
          <select id="dt" value={type} onChange={(e) => setType(e.target.value as DocType)} className={`${fieldBase} ${fieldBorder(false)}`}>
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {t.docType[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="dn" label={t.numberLbl}>
          <input id="dn" dir="ltr" maxLength={40} value={number} onChange={(e) => setNumber(e.target.value)} className={`${fieldBase} ${fieldBorder(Boolean(err))} text-start`} />
        </Field>
      </div>
      {err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Lock />
        {t.docHint}
      </span>
    </Dialog>
  );
}

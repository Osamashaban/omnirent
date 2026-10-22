"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveProperty, duplicateProperty, suggestCopyName } from "@/app/actions/properties";
import type { Lang } from "@/lib/i18n";
import { PROPERTY_DICTS, type PropertyDict } from "@/lib/property-i18n";
import { Dialog } from "@/components/ops/Overlay";
import { Archive, MoreHorizontal, Pencil, Home, Spinner } from "@/components/ops/icons";
import { dangerButtonClass, inputClass, secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";
import { Copy } from "@/components/broker/property-icons";

type Target = { id: string; nickname: string; units: number };

// The "…" menu on each row of the list: Open, Edit, Duplicate, Archive.
// Re-sync waits for the channel connection.
export function RowMenu({ lang, id, nickname, units, archived }: { lang: Lang; units: number; archived: boolean } & Omit<Target, "units">) {
  const p = PROPERTY_DICTS[lang];
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"duplicate" | "archive" | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[14px] font-medium text-[#111827] no-underline hover:bg-[#F3F4F6]";
  return (
    <div ref={box} className="relative inline-flex">
      <button
        type="button"
        aria-label={p.optionsFor(nickname)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
      >
        <MoreHorizontal />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-10 z-20 flex w-[240px] flex-col gap-0.5 rounded-xl border border-[#E5E7EB] bg-white p-1.5 text-start shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <Link role="menuitem" href={`/broker/properties/${id}`} className={item}>
            <Home size={18} />
            {p.open}
          </Link>
          {!archived && (
            <Link role="menuitem" href={`/broker/properties/${id}/edit`} className={item}>
              <Pencil size={18} />
              {p.edit}
            </Link>
          )}
          <button role="menuitem" type="button" className={item} onClick={() => (setOpen(false), setDialog("duplicate"))}>
            <Copy />
            {p.duplicate}
          </button>
          {!archived && (
            <button
              role="menuitem"
              type="button"
              className={`${item} text-[#B91C1C] hover:bg-[#FEE2E2]`}
              onClick={() => (setOpen(false), setDialog("archive"))}
            >
              <Archive />
              {p.archive}
            </button>
          )}
        </div>
      )}
      {dialog === "duplicate" && <DuplicateDialog p={p} target={{ id, nickname, units }} onClose={() => setDialog(null)} />}
      {dialog === "archive" && <ArchiveDialog p={p} target={{ id, nickname, units }} onClose={() => setDialog(null)} />}
    </div>
  );
}

// Duplicate, Archive and Edit at the top of the property page.
export function HeaderActions({ lang, target, archived }: { lang: Lang; target: Target; archived: boolean }) {
  const p = PROPERTY_DICTS[lang];
  const [dialog, setDialog] = useState<"duplicate" | "archive" | null>(null);
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className={secondaryButtonClass} onClick={() => setDialog("duplicate")}>
        <Copy />
        {p.duplicate}
      </button>
      {!archived && (
        <>
          <button type="button" className={secondaryButtonClass} onClick={() => setDialog("archive")}>
            <Archive />
            {p.archive}
          </button>
          <Link href={`/broker/properties/${target.id}/edit`} className={smallPrimaryButtonClass}>
            <Pencil />
            {p.edit}
          </Link>
        </>
      )}
      {dialog === "duplicate" && <DuplicateDialog p={p} target={target} onClose={() => setDialog(null)} />}
      {dialog === "archive" && <ArchiveDialog p={p} target={target} onClose={() => setDialog(null)} />}
    </div>
  );
}

const PARTS = ["units", "rates", "policies", "taxes", "content"] as const;

function DuplicateDialog({ p, target, onClose }: { p: PropertyDict; target: Target; onClose: () => void }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [parts, setParts] = useState({ units: true, rates: true, policies: true, taxes: true, content: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    suggestCopyName(target.id).then((name) => setNickname((v) => v || name));
  }, [target.id]);
  const submit = () =>
    start(async () => {
      if (!nickname.trim()) return setError(p.errors.required);
      const result = await duplicateProperty(target.id, nickname, { ...parts, rates: parts.units && parts.rates });
      if (!result.ok) return setError("error" in result ? p.errors.required : p.saveFailed);
      router.push("/broker/properties?done=copied");
      router.refresh();
    });
  return (
    <Dialog
      title={p.duplicateTitle}
      onClose={onClose}
      icon={
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
          <Copy size={22} />
        </span>
      }
      actions={
        <>
          <button type="button" disabled={pending} onClick={submit} className={`${smallPrimaryButtonClass} flex-1`}>
            {pending && <Spinner />}
            {p.createCopy}
          </button>
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} flex-1`}>
            {p.cancel}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0">{p.duplicateBody}</p>
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[#111827]">
          <span>
            {p.copyNickname} <span className="text-[#DC2626]">*</span>
          </span>
          <input
            value={nickname}
            maxLength={80}
            onChange={(e) => (setNickname(e.target.value), setError(null))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "copy-error" : undefined}
            className={inputClass}
          />
          {error && (
            <span id="copy-error" className="text-[13px] font-normal text-[#B91C1C]">
              {error}
            </span>
          )}
        </label>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[14px] font-semibold text-[#111827]">{p.whatToCopy}</legend>
          {PARTS.map((k) => (
            <label key={k} className="flex min-h-8 cursor-pointer items-center gap-3 text-[14px] text-[#111827] has-[:disabled]:opacity-50">
              <input
                type="checkbox"
                checked={parts[k] && (k !== "rates" || parts.units)}
                disabled={k === "rates" && !parts.units}
                onChange={(e) => setParts((v) => ({ ...v, [k]: e.target.checked }))}
                className="h-5 w-5 cursor-pointer accent-[#639922]"
              />
              {p.copyParts[k]}
            </label>
          ))}
        </fieldset>
      </div>
    </Dialog>
  );
}

function ArchiveDialog({ p, target, onClose }: { p: PropertyDict; target: Target; onClose: () => void }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const result = await archiveProperty(target.id);
      if (!result.ok) return setFailed(true);
      router.push("/broker/properties?done=archived");
      router.refresh();
    });
  return (
    <Dialog
      title={p.archiveTitle(target.nickname)}
      onClose={onClose}
      icon={
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
          <Archive size={22} />
        </span>
      }
      actions={
        <>
          <button type="button" disabled={pending} onClick={submit} className={`${dangerButtonClass} flex-1`}>
            {pending && <Spinner />}
            {p.archive}
          </button>
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} flex-1`}>
            {p.cancel}
          </button>
        </>
      }
    >
      {p.archiveBody(target.units)}
      {failed && <span className="mt-2 block text-[13px] text-[#B91C1C]">{p.saveFailed}</span>}
    </Dialog>
  );
}

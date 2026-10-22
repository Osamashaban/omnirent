"use client";

// Ops › Brokers, from the Ops_Brokers design page (version 62): the list with
// status chips and search, the Add / Edit broker drawer, and the row actions
// (Resend invite, Edit, Deactivate with a confirm, Reactivate). Desktop shows
// a table; phones show cards, as in the phone design.

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { resendBrokerInvite, saveBroker, setBrokerActive, type BrokerFormState, type BrokerRowResult } from "@/app/actions/brokers";
import { BROKER_DICTS, type BrokerDict } from "@/lib/broker-i18n";
import type { ListStatus } from "@/lib/broker-rules";
import { DICTS, type Lang } from "@/lib/i18n";
import { Dialog, Drawer, Toast } from "@/components/ops/Overlay";
import { AlertCircle, Briefcase, Chevron, Info, Mail, Pencil, Plus, Refresh, Search, Spinner } from "@/components/ops/icons";
import { FieldError, dangerButtonClass, inputClass, secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";

export type BrokerRow = {
  id: string;
  company: string;
  initials: string;
  cityId: string;
  city: string;
  approxUnits: number | null;
  notes: string;
  contact: string;
  email: string;
  mobile: string;
  mobileShown: string;
  status: ListStatus;
  last: string;
  actions: { resend: boolean; reactivate: boolean; deactivate: boolean };
};

export type CityOption = { id: string; name: string; country: string; hidden?: boolean };
type Counts = Record<"ALL" | ListStatus, number>;
type Filters = { q: string; status: ListStatus | "" };
type Panel = { kind: "add" } | { kind: "edit"; row: BrokerRow } | { kind: "deactivate"; row: BrokerRow } | null;

const STATUS_TONE: Record<ListStatus, string> = {
  ACTIVE: "bg-[#DCFCE7] text-[#15803D]",
  INVITED: "bg-[#DBEAFE] text-[#1D4ED8]",
  EXPIRED: "bg-[#FEF3C7] text-[#B45309]",
  DEACTIVATED: "bg-[#F3F4F6] text-[#4B5563]",
};

export function BrokersView({
  lang,
  rows,
  counts,
  cities,
  filters,
}: {
  lang: Lang;
  rows: BrokerRow[];
  counts: Counts;
  cities: CityOption[];
  filters: Filters;
}) {
  const b = BROKER_DICTS[lang];
  const t = DICTS[lang];
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [rowError, setRowError] = useState(false);
  const closePanel = useCallback(() => setPanel(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  const onRowResult = (result: BrokerRowResult, id: string) => {
    if (!result.ok) {
      setRowError(true);
      return;
    }
    setRowError(false);
    setHighlight(id);
    if (result.message === "resent") setToast(b.toastResent(result.email ?? ""));
    else if (result.message === "reactivated") setToast(b.toastReactivated(result.company ?? ""));
    else if (result.message === "deactivated") setToast(b.toastDeactivated(result.company ?? ""));
  };

  const empty = counts.ALL === 0;
  const add = () => setPanel({ kind: "add" });
  // A broker just added shows first, highlighted, as in the design.
  const ordered = highlight ? [...rows].sort((x, y) => (x.id === highlight ? -1 : y.id === highlight ? 1 : 0)) : rows;

  return (
    <>
      <div className="hidden flex-wrap items-end gap-4 min-[900px]:flex">
        <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold">{b.brokersTitle}</h1>
          <p className="m-0 max-w-[760px] text-[15px] leading-[1.6] text-[#4B5563]">{b.brokersBody}</p>
        </div>
        <button type="button" onClick={add} className={smallPrimaryButtonClass}>
          <Plus />
          {b.addBroker}
        </button>
      </div>

      {empty ? (
        <EmptyState b={b} onAdd={add} />
      ) : (
        <>
          <FilterBar b={b} counts={counts} filters={filters} onAdd={add} />
          {rowError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
              <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
              {b.somethingWrong}
            </div>
          )}
          {rows.length === 0 ? (
            <NoMatch b={b} q={filters.q} />
          ) : (
            <>
              <BrokersTable b={b} rows={ordered} highlight={highlight} onPanel={setPanel} onRowResult={onRowResult} />
              <BrokerCards b={b} rows={ordered} highlight={highlight} onRowResult={onRowResult} />
            </>
          )}
          <div role="note" className="hidden gap-2.5 rounded-[10px] bg-[#F3F4F6] px-3.5 py-3 text-[13px] leading-[1.6] text-[#4B5563] min-[900px]:flex">
            <Info size={18} className="mt-px flex-none" />
            <span>{b.inviteNote}</span>
          </div>
        </>
      )}

      {(panel?.kind === "add" || panel?.kind === "edit") && (
        <BrokerForm
          b={b}
          closeLabel={t.close}
          cities={cities}
          row={panel.kind === "edit" ? panel.row : undefined}
          onClose={closePanel}
          onDone={(done) => {
            setPanel(null);
            setHighlight(done.brokerId);
            setToast(done.kind === "added" ? b.toastAdded(done.company, done.email) : b.toastSaved(done.company));
          }}
        />
      )}
      {panel?.kind === "deactivate" && (
        <DeactivateDialog
          b={b}
          row={panel.row}
          onClose={closePanel}
          onResult={(result) => {
            setPanel(null);
            onRowResult(result, panel.row.id);
          }}
        />
      )}
      {toast && (
        <Toast onClose={closeToast} closeLabel={t.close}>
          {toast}
        </Toast>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function FilterBar({ b, counts, filters, onAdd }: { b: BrokerDict; counts: Counts; filters: Filters; onAdd: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const [, startTransition] = useTransition();
  const first = useRef(true);
  // The phone design has a shorter search hint; a placeholder can't be
  // switched with CSS, so follow the screen width.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const push = useCallback(
    (next: Partial<Filters>) => {
      const merged = { ...filters, q, ...next };
      const params = new URLSearchParams(Object.entries(merged).filter(([, v]) => v));
      startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
    },
    [filters, q, pathname, router],
  );

  // Search as you type, after a short pause.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => push({ q }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [q]);

  const chips: { key: Filters["status"]; label: string; phone: string | null }[] = [
    { key: "", label: b.chipAll, phone: b.chipAll },
    { key: "ACTIVE", label: b.status.ACTIVE, phone: b.status.ACTIVE },
    { key: "INVITED", label: b.status.INVITED, phone: b.phoneChipInvited },
    { key: "EXPIRED", label: b.status.EXPIRED, phone: b.chipExpiredShort },
    { key: "DEACTIVATED", label: b.status.DEACTIVATED, phone: null },
  ];
  const chipClass = (on: boolean) =>
    `inline-flex h-9 flex-none cursor-pointer items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold min-[900px]:px-3 ${
      on ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#374151]"
    }`;

  return (
    <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center">
      <div role="radiogroup" aria-label={b.statusLabel} className="flex gap-2 overflow-x-auto min-[900px]:flex-wrap min-[900px]:gap-1.5 min-[900px]:overflow-visible">
        {chips.map((chip) => {
          const count = counts[chip.key || "ALL"];
          const on = filters.status === chip.key;
          return (
            <button
              key={chip.key || "all"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => push({ status: chip.key })}
              className={`${chipClass(on)} ${chip.phone === null ? "max-[899px]:hidden" : ""}`}
            >
              <span className="max-[899px]:hidden">{`${chip.label} · ${count}`}</span>
              <span className="min-[900px]:hidden">{`${chip.phone} ${count}`}</span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 min-[900px]:ms-auto min-[900px]:flex-[0_1_300px]">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute start-3 text-[#6B7280] max-[899px]:hidden" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={b.searchBrokers}
            placeholder={phone ? b.searchBrokersPhone : b.searchBrokers}
            className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[14px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25 min-[900px]:ps-10"
          />
        </label>
        <button
          type="button"
          onClick={onAdd}
          aria-label={b.addBroker}
          className="inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-lg bg-[#639922] text-white hover:bg-[#4E8F20] min-[900px]:hidden"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ b, status, phone = false }: { b: BrokerDict; status: ListStatus; phone?: boolean }) {
  return phone ? (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-md px-2.5 text-[12px] font-semibold ${STATUS_TONE[status]}`}>
      {b.phoneStatus[status]}
    </span>
  ) : (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${STATUS_TONE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {b.status[status]}
    </span>
  );
}

const rowButton =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border bg-white px-3 text-[13px] font-semibold disabled:opacity-60";

type RowProps = {
  b: BrokerDict;
  rows: BrokerRow[];
  highlight: string | null;
  onRowResult: (r: BrokerRowResult, id: string) => void;
};

function BrokersTable({ b, rows, highlight, onPanel, onRowResult }: RowProps & { onPanel: (p: Panel) => void }) {
  const th = "whitespace-nowrap border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]";
  const td = "border-b border-[#F3F4F6] px-4 py-3 align-middle text-[14px]";
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] min-[900px]:block">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr>
            <th className={th}>{b.colCompany}</th>
            <th className={th}>{b.colContact}</th>
            <th className={th}>{b.colStatus}</th>
            <th className={th}>{b.colLastActivity}</th>
            <th className={th}>
              <span className="sr-only">{b.colActions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.id === highlight ? "bg-[#F7FBF1]" : undefined}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <CompanyTile initials={row.initials} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold">{row.company}</span>
                    <span className="text-[13px] text-[#6B7280]">
                      {row.city} · {row.approxUnits ? b.approxUnits(row.approxUnits) : b.unitsNotSet}
                    </span>
                  </div>
                </div>
              </td>
              <td className={td}>
                <div className="flex flex-col gap-0.5">
                  <span>{row.contact}</span>
                  <span dir="ltr" className="text-start text-[13px] text-[#6B7280] rtl:text-right">
                    {row.email}
                  </span>
                  <span dir="ltr" className="text-start text-[13px] text-[#6B7280] rtl:text-right">
                    {row.mobileShown}
                  </span>
                </div>
              </td>
              <td className={td}>
                <StatusBadge b={b} status={row.status} />
              </td>
              <td className={`${td} text-[#4B5563]`}>{row.last}</td>
              <td className={`${td} w-[250px]`}>
                <RowActions b={b} row={row} onPanel={onPanel} onRowResult={onRowResult} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 text-[13px] text-[#6B7280]">{b.brokerCount(rows.length)}</div>
    </div>
  );
}

function CompanyTile({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden="true"
      dir="ltr"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[#1F3510] text-[12px] font-bold text-[#C0DD97]"
    >
      {initials}
    </span>
  );
}

function RowActions({ b, row, onPanel, onRowResult }: { b: BrokerDict; row: BrokerRow; onPanel: (p: Panel) => void; onRowResult: (r: BrokerRowResult, id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<BrokerRowResult>) => startTransition(async () => onRowResult(await fn(), row.id));
  return (
    <div className="flex justify-end gap-1.5">
      {row.actions.resend && (
        <button type="button" disabled={pending} onClick={() => run(() => resendBrokerInvite(row.id))} className={`${rowButton} border-[#D1D5DB] text-[#111827]`}>
          {pending ? <Spinner size={16} /> : <Mail />}
          {b.resendInvite}
        </button>
      )}
      {row.actions.reactivate && (
        <button type="button" disabled={pending} onClick={() => run(() => setBrokerActive(row.id, true))} className={`${rowButton} border-[#D1D5DB] text-[#111827]`}>
          {pending ? <Spinner size={16} /> : <Refresh size={16} />}
          {b.reactivate}
        </button>
      )}
      <button
        type="button"
        onClick={() => onPanel({ kind: "edit", row })}
        aria-label={b.editLabel(row.company)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563] hover:bg-[#F3F4F6]"
      >
        <Pencil />
      </button>
      {row.actions.deactivate && (
        <button type="button" onClick={() => onPanel({ kind: "deactivate", row })} className={`${rowButton} border-[#FECACA] text-[#B91C1C]`}>
          {b.deactivate}
        </button>
      )}
    </div>
  );
}

function BrokerCards({ b, rows, highlight, onRowResult }: RowProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 min-[900px]:hidden">
      {rows.map((row) => (
        <BrokerCard key={row.id} b={b} row={row} highlighted={row.id === highlight} onRowResult={onRowResult} />
      ))}
    </ul>
  );
}

function BrokerCard({ b, row, highlighted, onRowResult }: { b: BrokerDict; row: BrokerRow; highlighted: boolean; onRowResult: (r: BrokerRowResult, id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<BrokerRowResult>) => startTransition(async () => onRowResult(await fn(), row.id));
  const action = row.actions.resend
    ? { label: b.resendInvite, fn: () => resendBrokerInvite(row.id) }
    : row.actions.reactivate
      ? { label: b.reactivate, fn: () => setBrokerActive(row.id, true) }
      : null;
  return (
    <li className={`flex flex-col gap-2.5 rounded-xl border border-[#E5E7EB] p-3 ${highlighted ? "bg-[#F7FBF1]" : "bg-white"}`}>
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-bold">{row.company}</span>
          <span className="text-[13px] text-[#6B7280]">
            {row.contact} · {row.city} · {row.approxUnits ? b.approxUnits(row.approxUnits) : b.unitsNotSet}
          </span>
        </div>
        <StatusBadge b={b} status={row.status} phone />
      </div>
      {action && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(action.fn)}
          className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white text-[14px] font-semibold text-[#111827] disabled:opacity-60"
        >
          {pending && <Spinner size={16} />}
          {action.label}
        </button>
      )}
    </li>
  );
}

function EmptyState({ b, onAdd }: { b: BrokerDict; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
        <Briefcase size={26} />
      </span>
      <h2 className="m-0 text-[20px] font-bold">{b.emptyTitle}</h2>
      <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{b.emptyBody}</p>
      <button type="button" onClick={onAdd} className={smallPrimaryButtonClass}>
        <Plus />
        {b.addBroker}
      </button>
    </div>
  );
}

function NoMatch({ b, q }: { b: BrokerDict; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]">
        <Search size={26} />
      </span>
      <h2 className="m-0 text-[20px] font-bold">{q ? b.noResultsFor(q) : b.noBrokersWithStatus}</h2>
      <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{b.noResultsBody}</p>
      <button type="button" className={secondaryButtonClass} onClick={() => router.replace(pathname)}>
        {b.clearSearch}
      </button>
    </div>
  );
}

function DeactivateDialog({ b, row, onClose, onResult }: { b: BrokerDict; row: BrokerRow; onClose: () => void; onResult: (r: BrokerRowResult) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      title={b.deactivateTitle(row.company)}
      onClose={onClose}
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
          <AlertCircle size={24} />
        </div>
      }
      actions={
        <>
          <button
            type="button"
            disabled={pending}
            className={`${dangerButtonClass} flex-1`}
            onClick={() => startTransition(async () => onResult(await setBrokerActive(row.id, false)))}
          >
            {pending && <Spinner />}
            {b.deactivateButton}
          </button>
          <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={onClose}>
            {b.cancel}
          </button>
        </>
      }
    >
      {b.deactivateBody}
    </Dialog>
  );
}

function BrokerForm({
  b,
  closeLabel,
  cities,
  row,
  onClose,
  onDone,
}: {
  b: BrokerDict;
  closeLabel: string;
  cities: CityOption[];
  row?: BrokerRow;
  onClose: () => void;
  onDone: (done: NonNullable<BrokerFormState["done"]>) => void;
}) {
  const editing = Boolean(row);
  const options = cities.filter((c) => !c.hidden || c.id === row?.cityId);
  const [state, action, pending] = useActionState<BrokerFormState, FormData>(saveBroker, {
    values: row
      ? {
          company: row.company,
          contact: row.contact,
          mobile: row.mobileShown,
          email: row.email,
          cityId: row.cityId,
          units: row.approxUnits ? String(row.approxUnits) : "",
          notes: row.notes,
        }
      : { company: "", contact: "", mobile: "+20 ", email: "", cityId: options[0]?.id ?? "", units: "", notes: "" },
  });
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (state.done && handled.current !== state.done.at) {
      handled.current = state.done.at;
      onDone(state.done);
    }
  }, [state.done, onDone]);

  const values = state.values ?? { company: "", contact: "", mobile: "", email: "", cityId: "", units: "", notes: "" };
  const errors = state.errors ?? {};
  // Remounts the fields with the values sent back after a failed save.
  const formKey = JSON.stringify(values);
  const label = (htmlFor: string, text: string, required = false) => (
    <label htmlFor={htmlFor} className="text-[14px] font-medium">
      {text}
      {required && (
        <>
          {" "}
          <span aria-hidden="true" className="text-[#B91C1C]">
            *
          </span>
        </>
      )}
    </label>
  );
  const fieldClass = `${inputClass} h-11 px-3`;
  const countries = [...new Set(options.map((c) => c.country))];

  return (
    <form action={action} noValidate className="contents">
      <Drawer
        title={editing ? b.editBroker : b.addBroker}
        description={editing ? b.editBrokerSub : b.addBrokerSub}
        closeLabel={closeLabel}
        onClose={onClose}
        widthClass="min-[900px]:w-[480px]"
        footer={
          <>
            <button type="submit" disabled={pending} className={`${smallPrimaryButtonClass} flex-1`}>
              {pending && <Spinner />}
              {editing ? b.save : b.addAndInvite}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              {b.cancel}
            </button>
          </>
        }
      >
        <div key={formKey} className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-5 min-[900px]:p-6">
          {row && <input type="hidden" name="brokerId" value={row.id} />}
          {state.formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
              <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
              {b.somethingWrong}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            {label("bk_company", b.companyName, true)}
            <input
              id="bk_company"
              name="company"
              defaultValue={values.company}
              autoComplete="off"
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={errors.company ? "bk_company_error" : undefined}
              className={fieldClass}
            />
            {errors.company && <FieldError id="bk_company_error">{b.errCompany}</FieldError>}
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              {label("bk_contact", b.contactName, true)}
              <input
                id="bk_contact"
                name="contact"
                defaultValue={values.contact}
                autoComplete="off"
                aria-invalid={errors.contact ? true : undefined}
                aria-describedby={errors.contact ? "bk_contact_error" : undefined}
                className={fieldClass}
              />
              {errors.contact && <FieldError id="bk_contact_error">{b.errContact}</FieldError>}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              {label("bk_mobile", b.mobile, true)}
              <input
                id="bk_mobile"
                name="mobile"
                type="tel"
                dir="ltr"
                defaultValue={values.mobile}
                placeholder="+20 100 000 0000"
                autoComplete="off"
                aria-invalid={errors.mobile ? true : undefined}
                aria-describedby={errors.mobile ? "bk_mobile_error" : undefined}
                className={`${fieldClass} text-start`}
              />
              {errors.mobile && <FieldError id="bk_mobile_error">{b.errMobile}</FieldError>}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            {label("bk_email", b.signInEmail, true)}
            <input
              id="bk_email"
              name="email"
              type="email"
              dir="ltr"
              defaultValue={values.email}
              placeholder="name@company.com"
              autoComplete="off"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "bk_email_error" : undefined}
              className={`${fieldClass} text-start`}
            />
            {errors.email && <FieldError id="bk_email_error">{errors.email === "taken" ? b.errEmailTaken : b.errEmail}</FieldError>}
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              {label("bk_city", b.mainCity, true)}
              <div className="relative flex items-center">
                <select
                  id="bk_city"
                  name="cityId"
                  defaultValue={values.cityId}
                  aria-invalid={errors.cityId ? true : undefined}
                  aria-describedby={errors.cityId ? "bk_city_error" : undefined}
                  className={`${fieldClass} cursor-pointer appearance-none pe-9`}
                >
                  {countries.length > 1
                    ? countries.map((country) => (
                        <optgroup key={country} label={country}>
                          {options
                            .filter((c) => c.country === country)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </optgroup>
                      ))
                    : options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                </select>
                <Chevron className="pointer-events-none absolute end-3 text-[#6B7280]" />
              </div>
              {errors.cityId && <FieldError id="bk_city_error">{b.errCity}</FieldError>}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              {label("bk_units", b.approxUnitsLabel)}
              <input
                id="bk_units"
                name="units"
                type="number"
                min={1}
                inputMode="numeric"
                dir="ltr"
                defaultValue={values.units}
                placeholder="10"
                className={`${fieldClass} text-start`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {label("bk_notes", b.callNotes)}
            <textarea
              id="bk_notes"
              name="notes"
              defaultValue={values.notes}
              placeholder={b.callNotesPlaceholder}
              className="min-h-[84px] w-full resize-y rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-[14px] leading-[1.6] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25"
            />
          </div>
          {!editing && (
            <div className="flex gap-2.5 rounded-lg bg-[#EAF3DE] px-3.5 py-3 text-[13px] leading-[1.6] text-[#27500A]">
              <Info size={18} className="mt-px flex-none" />
              <span>{b.addInfo}</span>
            </div>
          )}
        </div>
      </Drawer>
    </form>
  );
}

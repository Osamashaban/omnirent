"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { savePropertyType, setPropertyTypeArchived, type PropertyTypeFormState } from "@/app/actions/catalog";
import { DICTS, type Dict, type Lang } from "@/lib/i18n";
import {
  CHANNELS,
  CHANNEL_TYPE_OPTIONS,
  HOTEL_TYPES,
  VACATION_RENTAL_TYPES,
  billingFor,
  channelName,
  suggestedChannelName,
} from "@/lib/channex-catalog";
import { GROUPS, RENT_MODES, rentModeFor, type Group, type RentMode, type Status } from "@/lib/property-type-rules";
import { Drawer, Toast } from "@/components/ops/Overlay";
import { Badge, PageHeader } from "@/components/ops/PageStates";
import { ConfirmDialog, FormAlert, SearchBox, fieldClass } from "@/components/ops/SettingsParts";
import { AlertCircle, Archive, Chevron, Eye, Home, Info, Pencil, Plus, Refresh, Search, Spinner } from "@/components/ops/icons";
import { FieldError, secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";

export type TypeRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  group: Group;
  channexType: string;
  rentMode: RentMode;
  status: Status;
  channelNames: Record<string, string>;
  inUse: number;
};

type Tab = Status;
type Panel =
  | { kind: "add"; prefill: string }
  | { kind: "edit"; type: TypeRow }
  | { kind: "view"; type: TypeRow }
  | { kind: "archive"; type: TypeRow }
  | null;

const iconButton = "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563] hover:bg-[#F3F4F6]";
const MAIN_CHANNELS = CHANNELS.filter((c) => c.main);

function BillPill({ t, channexType }: { t: Dict; channexType: string }) {
  return billingFor(channexType) === "property" ? <Badge tone="blue">{t.perProperty}</Badge> : <Badge tone="lime">{t.perUnit}</Badge>;
}

export function PropertyTypesView({ lang, types }: { lang: Lang; types: TypeRow[] }) {
  const t = DICTS[lang];
  const name = useCallback((x: { nameAr: string; nameEn: string }) => (lang === "ar" ? x.nameAr : x.nameEn), [lang]);
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [pending, startAction] = useTransition();
  const close = useCallback(() => setPanel(null), []);
  const closeToast = useCallback(() => {
    setToast(null);
    setHighlight(null);
  }, []);

  const count = (s: Status) => types.filter((x) => x.status === s).length;
  const q = query.trim().toLowerCase();
  const rows = types.filter((x) => x.status === tab && (!q || `${x.nameAr} ${x.nameEn} ${x.channexType}`.toLowerCase().includes(q)));
  const tabs: [Tab, string][] = [
    ["ACTIVE", t.tabActive],
    ["HIDDEN", t.tabHidden],
    ["ARCHIVED", t.tabArchived],
  ];

  const openAdd = (prefill = "") => setPanel({ kind: "add", prefill });
  const say = (message: string, id?: string) => {
    setToast(message);
    setHighlight(id ?? null);
  };
  const restore = (row: TypeRow) =>
    startAction(async () => {
      const result = await setPropertyTypeArchived(row.id, false);
      say(result.ok ? t.typeRestored(name(row)) : t.somethingWrong, row.id);
    });
  const archive = (row: TypeRow) =>
    startAction(async () => {
      const result = await setPropertyTypeArchived(row.id, true);
      setPanel(null);
      say(result.ok ? t.typeArchived(name(row)) : t.somethingWrong);
    });

  const addButton = (
    <button type="button" onClick={() => openAdd()} className={smallPrimaryButtonClass}>
      <Plus />
      {t.addType}
    </button>
  );

  const overlays = (
    <>
      {(panel?.kind === "add" || panel?.kind === "edit") && (
        <TypeDrawer
          t={t}
          lang={lang}
          type={panel.kind === "edit" ? panel.type : null}
          prefill={panel.kind === "add" ? panel.prefill : ""}
          onClose={close}
          onDone={(d) => {
            close();
            setTab(d.status);
            setQuery("");
            say(!d.added ? t.typeSaved(name(d)) : d.status === "HIDDEN" ? t.typeAddedHidden(name(d)) : t.typeAdded(name(d)), d.id);
          }}
        />
      )}
      {panel?.kind === "view" && (
        <ViewDrawer t={t} lang={lang} type={panel.type} onClose={close} onEdit={() => setPanel({ kind: "edit", type: panel.type })} />
      )}
      {panel?.kind === "archive" && (
        <ConfirmDialog
          t={t}
          tone="grey"
          icon={<Archive size={24} />}
          title={t.archiveTitle(name(panel.type))}
          body={panel.type.inUse > 0 ? t.archiveBodyInUse(panel.type.inUse) : t.archiveBody}
          goLabel={t.archive}
          pending={pending}
          onClose={close}
          onGo={() => archive(panel.type)}
        />
      )}
      {toast && (
        <Toast onClose={closeToast} closeLabel={t.close}>
          {toast}
        </Toast>
      )}
    </>
  );

  if (types.length === 0) {
    return (
      <>
        <PageHeader crumb={t.ptBreadcrumb} title={t.propertyTypesNav} />
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Home />
          </span>
          <h2 className="m-0 text-[20px] font-bold">{t.noTypesYet}</h2>
          <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noTypesBody}</p>
          {addButton}
        </div>
        {overlays}
      </>
    );
  }

  const noRows = (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]">
        <Search size={26} />
      </span>
      <h2 className="m-0 text-[20px] font-bold">{q ? t.noTypeCalled(query.trim()) : t.noTypesHere}</h2>
      <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noTypeBody}</p>
      <button type="button" onClick={() => openAdd(query.trim())} className={secondaryButtonClass}>
        <Plus />
        {q ? t.addNamedType(query.trim()) : t.addType}
      </button>
    </div>
  );

  return (
    <>
      <PageHeader crumb={t.ptBreadcrumb} title={t.propertyTypesNav} intro={t.ptIntro} action={addButton} />

      {/* Desktop */}
      <div className="hidden flex-col gap-5 min-[900px]:flex">
        <div className="flex flex-wrap items-center gap-[22px] border-b border-[#E5E7EB]">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
              className={`-mb-px flex h-11 cursor-pointer items-center gap-2 border-b-2 bg-transparent px-0.5 text-[14px] ${
                tab === k ? "border-[#639922] font-semibold text-[#27500A]" : "border-transparent font-medium text-[#4B5563]"
              }`}
            >
              {label}
              <span className="rounded-full bg-[#F3F4F6] px-2 py-px text-[12px] font-semibold text-[#4B5563]">{count(k)}</span>
            </button>
          ))}
          <SearchBox value={query} onChange={setQuery} label={t.searchTypes} placeholder={t.searchTypesPlaceholder} className="ms-auto w-[300px]" />
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr>
                  {[t.colType, t.colGroup, "Channex", t.colChannexBilling, "Booking.com", "Airbnb", t.colInUse].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]">
                      {h}
                    </th>
                  ))}
                  <th className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                    <span className="sr-only">{t.colActions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const td = "border-b border-[#F3F4F6] px-4 py-3 align-middle text-[14px]";
                  return (
                    <tr key={row.id} className={highlight === row.id ? "bg-[#F7FBF1]" : ""}>
                      <td className={td}>
                        <button
                          type="button"
                          onClick={() => setPanel({ kind: "view", type: row })}
                          className="cursor-pointer border-0 bg-transparent p-0 text-start text-[14px] font-semibold text-[#111827] hover:underline"
                        >
                          {name(row)}
                        </button>
                      </td>
                      <td className={`${td} text-[#4B5563]`}>
                        <div className="flex flex-col gap-0.5">
                          <span>{t.groupNames[row.group]}</span>
                          {row.group === "HOTELS" && <span className="text-[12px] text-[#B45309]">{t.notShownYet}</span>}
                        </div>
                      </td>
                      <td className={td}>
                        <span dir="ltr" className="rounded-md bg-[#F3F4F6] px-2 py-0.5 font-mono text-[13px]">
                          {row.channexType}
                        </span>
                      </td>
                      <td className={td}>
                        <BillPill t={t} channexType={row.channexType} />
                      </td>
                      <td className={`${td} text-[#4B5563]`} dir="ltr">
                        {channelName(row.channexType, row.channelNames, "booking")}
                      </td>
                      <td className={`${td} text-[#4B5563]`} dir="ltr">
                        {channelName(row.channexType, row.channelNames, "airbnb")}
                      </td>
                      <td className={`${td} tabular-nums text-[#4B5563]`}>{row.inUse}</td>
                      <td className={`${td} w-[140px]`}>
                        <div className="flex gap-1">
                          {row.status === "ARCHIVED" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => restore(row)}
                              className="inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#D1D5DB] bg-white px-3 text-[13px] font-semibold text-[#111827]"
                            >
                              <Refresh size={16} />
                              {t.restore}
                            </button>
                          ) : (
                            <>
                              <button type="button" aria-label={t.viewNamed(name(row))} onClick={() => setPanel({ kind: "view", type: row })} className={iconButton}>
                                <Eye />
                              </button>
                              <button type="button" aria-label={t.editNamed(name(row))} onClick={() => setPanel({ kind: "edit", type: row })} className={iconButton}>
                                <Pencil />
                              </button>
                              <button type="button" aria-label={t.archiveNamed(name(row))} onClick={() => setPanel({ kind: "archive", type: row })} className={iconButton}>
                                <Archive />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 text-[13px] text-[#6B7280]">{t.ptFoot(count("ACTIVE"), count("HIDDEN"), count("ARCHIVED"))}</div>
          </div>
        ) : (
          noRows
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-3 min-[900px]:hidden">
        <div className="flex gap-2">
          <SearchBox value={query} onChange={setQuery} label={t.searchTypes} className="flex-1" />
          <button
            type="button"
            aria-label={t.addType}
            onClick={() => openAdd()}
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-lg bg-[#639922] text-white"
          >
            <Plus />
          </button>
        </div>
        <div className="flex gap-2">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
              className={`inline-flex h-6 cursor-pointer items-center whitespace-nowrap rounded-md px-2.5 text-[12px] font-semibold ${
                tab === k ? "bg-[#EAF3DE] text-[#27500A]" : "bg-[#F3F4F6] text-[#374151]"
              }`}
            >
              {label} {count(k)}
            </button>
          ))}
        </div>
        {rows.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] p-3 ${highlight === row.id ? "bg-[#F7FBF1]" : "bg-white"}`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px] font-bold">{name(row)}</span>
                  <span className="text-[12px] text-[#6B7280]">
                    <span dir="ltr">Channex: {row.channexType}</span> · {t.inUseCount(row.inUse)}
                  </span>
                </div>
                <BillPill t={t} channexType={row.channexType} />
                {row.status === "ARCHIVED" ? (
                  <button
                    type="button"
                    aria-label={t.restore}
                    disabled={pending}
                    onClick={() => restore(row)}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center text-[#4B5563]"
                  >
                    <Refresh />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={t.editNamed(name(row))}
                    onClick={() => setPanel({ kind: "edit", type: row })}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center text-[#4B5563]"
                  >
                    <Pencil />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          noRows
        )}
      </div>

      {overlays}
    </>
  );
}

function CostCard({ t, channexType }: { t: Dict; channexType: string }) {
  const perProperty = billingFor(channexType) === "property";
  const examples = perProperty
    ? [
        [t.costAnyRooms, "$7.00"],
        [t.costMaxExtras, "$21.00"],
      ]
    : [
        [t.costWholeUnit, "$0.50"],
        [t.costWholePlus3, "$2.00"],
      ];
  return (
    <section aria-label={t.monthlyCost} className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-[#C0DD97] bg-[#F7FBF1] p-4">
      <div className="flex items-center gap-2">
        <span className="flex text-[#3B6D11]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 17.5v-11" />
          </svg>
        </span>
        <span className="flex-1 text-[15px] font-bold">{t.monthlyCost}</span>
        <BillPill t={t} channexType={channexType} />
      </div>
      <span className="text-[24px] font-bold text-[#27500A]">{perProperty ? t.costPropertyMain : t.costUnitMain}</span>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {examples.map(([label, value]) => (
          <li key={label} className="flex justify-between gap-3 text-[14px]">
            <span className="text-[#374151]">{label}</span>
            <span dir="ltr" className="font-bold tabular-nums">
              {value}
            </span>
          </li>
        ))}
      </ul>
      <span className="text-[12px] leading-[1.6] text-[#6B7280]">{perProperty ? t.costNoteProperty : t.costNoteUnit}</span>
    </section>
  );
}

function RadioCard({
  on,
  onPick,
  children,
  alignTop = false,
}: {
  on: boolean;
  onPick: () => void;
  children: React.ReactNode;
  alignTop?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`flex cursor-pointer gap-2.5 rounded-[10px] p-3 text-start text-[15px] font-semibold text-[#111827] ${alignTop ? "items-start" : "items-center"} ${
        on ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white"
      }`}
    >
      <span
        className={`box-border h-[18px] w-[18px] flex-none rounded-full bg-white ${alignTop ? "mt-0.5" : ""} ${
          on ? "border-[6px] border-[#639922]" : "border-[1.5px] border-[#9CA3AF]"
        }`}
      />
      {children}
    </button>
  );
}

function TypeDrawer({
  t,
  lang,
  type,
  prefill,
  onClose,
  onDone,
}: {
  t: Dict;
  lang: Lang;
  type: TypeRow | null;
  prefill: string;
  onClose: () => void;
  onDone: (d: NonNullable<PropertyTypeFormState["done"]>) => void;
}) {
  const [state, action, saving] = useActionState<PropertyTypeFormState, FormData>(savePropertyType, {});
  const startsArabic = /[؀-ۿ]/.test(prefill);
  const [nameAr, setNameAr] = useState(type?.nameAr ?? (startsArabic ? prefill : ""));
  const [nameEn, setNameEn] = useState(type?.nameEn ?? (startsArabic ? "" : prefill));
  const [group, setGroup] = useState<Group>(type?.group ?? "APARTMENTS");
  const [chx, setChx] = useState(type?.channexType ?? "");
  const [mode, setMode] = useState<RentMode>(type?.rentMode ?? "WHOLE");
  const [visible, setVisible] = useState(type ? type.status === "ACTIVE" : true);
  const [names, setNames] = useState<Record<string, string>>(type?.channelNames ?? {});
  const [chq, setChq] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (state.done && handled.current !== state.done.at) {
      handled.current = state.done.at;
      onDone(state.done);
    }
  }, [state.done, onDone]);
  const errors = state.errors ?? {};
  const errorCount = Object.keys(errors).length;

  const value = (id: string) => channelName(chx, names, id);
  const edited = (id: string) => !!chx && value(id) !== suggestedChannelName(chx, id);
  const editedCount = CHANNELS.filter((c) => edited(c.id)).length;
  const cq = chq.trim().toLowerCase();
  const pool = cq ? CHANNELS.filter((c) => c.name.toLowerCase().includes(cq)) : showAll ? CHANNELS : MAIN_CHANNELS;

  const pickChx = (c: string) => {
    setChx(c);
    setNames({});
    setMode((m) => rentModeFor(c, m));
    setListOpen(false);
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    for (const c of CHANNELS) form.set(`channel_${c.id}`, value(c.id));
    startTransition(() => action(form));
  };

  const arError =
    errors.nameAr === "typeExists" ? t.typeExists(state.duplicateAr ?? nameAr) : errors.nameAr && (t[errors.nameAr] as string);
  const enError =
    errors.nameEn === "typeExists" ? t.typeExistsEn(state.duplicateEn ?? nameEn) : errors.nameEn && (t[errors.nameEn] as string);

  return (
    <form onSubmit={submit} className="contents" noValidate>
      <Drawer
        title={type ? t.editTypeTitle : t.addTypeTitle}
        description={type ? t.editTypeBody(lang === "ar" ? type.nameAr : type.nameEn, type.inUse) : t.addTypeBody}
        closeLabel={t.close}
        onClose={onClose}
        widthClass="min-[900px]:w-[520px]"
        footer={
          <>
            <button type="submit" disabled={saving} className={`${smallPrimaryButtonClass} flex-1`}>
              {saving && <Spinner />}
              {t.save}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              {t.cancel}
            </button>
          </>
        }
      >
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-5 min-[900px]:p-6">
          {type && <input type="hidden" name="typeId" value={type.id} />}
          <input type="hidden" name="group" value={group} />
          <input type="hidden" name="channexType" value={chx} />
          <input type="hidden" name="rentMode" value={mode} />
          {state.formError && <FormAlert text={t.somethingWrong} />}
          {errorCount > 0 && (
            <div key={state.failedAt} role="alert" className="flex gap-3 rounded-[10px] border border-[#FECACA] bg-[#FEE2E2] px-4 py-3.5">
              <AlertCircle size={20} className="flex-none text-[#B91C1C]" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[#B91C1C]">{t.fixFields}</span>
                <span className="text-[13px] text-[#374151]">{t.fieldsNeedChanges(errorCount)}</span>
              </div>
            </div>
          )}
          {type && type.inUse > 0 && (
            <div role="status" className="flex gap-3 rounded-[10px] border border-[#BFDBFE] bg-[#DBEAFE] px-4 py-3.5">
              <Info className="flex-none text-[#1D4ED8]" />
              <span className="text-[13px] leading-[1.6] text-[#374151]">{t.inUseNote(type.inUse)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <NameField id="nar" label={t.arabicName} name="nameAr" dir="rtl" value={nameAr} onChange={setNameAr} error={arError || undefined} />
            <NameField id="nen" label={t.englishName} name="nameEn" dir="ltr" value={nameEn} onChange={setNameEn} error={enError || undefined} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">
              {t.groupLabel} <span className="text-[#B91C1C]">*</span>
            </span>
            <div role="radiogroup" aria-label={t.groupLabel} className="grid grid-cols-2 gap-2">
              {GROUPS.map((g) => (
                <RadioCard key={g} on={group === g} onPick={() => setGroup(g)} alignTop>
                  <span className="flex flex-col gap-0.5">
                    <span>{t.groupNames[g]}</span>
                    <span className="text-[12px] font-medium leading-[1.5] text-[#6B7280]">{t.groupDescs[g]}</span>
                  </span>
                </RadioCard>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative flex flex-col gap-1.5">
              <label htmlFor="chx" className="text-[14px] font-medium">
                {t.channexType}{" "}
                <span aria-hidden="true" className="text-[#B91C1C]">
                  *
                </span>
              </label>
              <button
                id="chx"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={listOpen}
                aria-describedby={errors.channexType ? "chx-error" : undefined}
                onClick={() => setListOpen((o) => !o)}
                className={`flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-start text-[15px] text-[#111827] ${
                  errors.channexType ? "border-[1.5px] border-[#DC2626]" : "border border-[#D1D5DB]"
                }`}
              >
                <span dir="ltr" className={chx ? "" : "text-[#9CA3AF]"}>
                  {chx || t.chooseFrom19}
                </span>
                {chx && <BillPill t={t} channexType={chx} />}
                <Chevron className="ms-auto text-[#6B7280]" />
              </button>
              {errors.channexType && (
                <FieldError id="chx-error">
                  <span role="alert" className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="flex-none" />
                    {t.chooseChannexType}
                  </span>
                </FieldError>
              )}
              {listOpen && <ChannexList t={t} value={chx} onPick={pickChx} onClose={() => setListOpen(false)} />}
            </div>
            {chx && <CostCard t={t} channexType={chx} />}
            <span className="text-[13px] text-[#6B7280]">{t.channexHelp}</span>
          </div>

          <section className="flex flex-col gap-3 rounded-[10px] border border-[#E5E7EB] p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[14px] font-semibold">{t.channelNamesHeading}</span>
              <span className="text-[12px] text-[#6B7280]">{t.channelsSummary(CHANNELS.length, editedCount)}</span>
            </div>
            <span className="text-[13px] leading-[1.6] text-[#6B7280]">{t.channelNamesHelp}</span>
            <SearchBox value={chq} onChange={setChq} label={t.searchChannels} placeholder={t.searchChannelsPlaceholder(CHANNELS.length)} />
            <span className="text-[12px] font-bold text-[#6B7280]">
              {cq ? t.nResults(pool.length) : showAll ? t.allChannels(CHANNELS.length) : t.mainChannels}
            </span>
            {pool.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {pool.map((c) => {
                  const isEdited = edited(c.id);
                  const tag = !chx ? t.tagPickFirst : isEdited ? t.tagEdited : c.main ? t.tagSuggested : t.tagSameAsChannex;
                  return (
                    <li key={c.id} className="flex items-center gap-2.5 rounded-[10px] border border-[#E5E7EB] px-2.5 py-2">
                      <span
                        dir="ltr"
                        style={{ background: c.color }}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      >
                        {c.initials}
                      </span>
                      <div className="flex w-[132px] min-w-0 flex-none flex-col gap-0.5 max-[899px]:w-[100px]">
                        <span className="truncate text-[14px] font-semibold">{c.name}</span>
                        <span className={`text-[11px] font-semibold ${isEdited ? "text-[#B45309]" : "text-[#6B7280]"}`}>{tag}</span>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        list={CHANNEL_TYPE_OPTIONS[c.id] ? `dl_${c.id}` : undefined}
                        value={value(c.id)}
                        disabled={!chx}
                        maxLength={80}
                        onChange={(e) => setNames((n) => ({ ...n, [c.id]: e.target.value }))}
                        aria-label={t.nameOnChannel(c.name)}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-[#D1D5DB] px-2.5 text-start text-[14px] outline-none focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25 disabled:bg-[#F3F4F6]"
                      />
                      {isEdited ? (
                        <button
                          type="button"
                          aria-label={t.resetSuggested}
                          title={t.resetSuggested}
                          onClick={() =>
                            setNames((n) => {
                              const rest = { ...n };
                              delete rest[c.id];
                              return rest;
                            })
                          }
                          className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-lg text-[#3B6D11] hover:bg-[#F3F4F6]"
                        >
                          <Refresh />
                        </button>
                      ) : (
                        <span className="w-9 flex-none" />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#D1D5DB] p-4 text-center text-[14px] text-[#4B5563]">
                {t.noChannelCalled(chq.trim())}
              </div>
            )}
            {!cq && (
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#9CA3AF] bg-white px-[18px] text-[14px] font-semibold text-[#111827]"
              >
                {showAll ? t.showMainChannels : t.showAllChannels(CHANNELS.length)}
              </button>
            )}
            {Object.entries(CHANNEL_TYPE_OPTIONS).map(([id, options]) => (
              <datalist key={id} id={`dl_${id}`}>
                {options.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            ))}
          </section>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">{t.rentModeHeading}</span>
            <div role="radiogroup" aria-label={t.rentModeHeading} className="grid grid-cols-3 gap-2">
              {RENT_MODES.map((m) => (
                <RadioCard key={m} on={mode === m} onPick={() => setMode(m)}>
                  {t.rentModeNames[m]}
                </RadioCard>
              ))}
            </div>
            <span className="text-[13px] text-[#6B7280]">{t.rentModeHelp}</span>
          </div>

          {type?.status !== "ARCHIVED" && (
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                role="switch"
                name="visible"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                className="m-0 h-5 w-5 flex-none accent-[#639922]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium">{t.shownWhenAdding}</span>
                <span className="text-[13px] text-[#6B7280]">{t.shownHelp}</span>
              </span>
            </label>
          )}
        </div>
      </Drawer>
    </form>
  );
}

function NameField({
  id,
  label,
  name,
  dir,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  name: string;
  dir: "rtl" | "ltr";
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">
        {label}{" "}
        <span aria-hidden="true" className="text-[#B91C1C]">
          *
        </span>
      </label>
      <input
        id={id}
        name={name}
        dir={dir}
        value={value}
        maxLength={80}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass}
      />
      {error && (
        <FieldError id={`${id}-error`}>
          <span role="alert" className="flex items-center gap-1.5">
            <AlertCircle size={14} className="flex-none" />
            {error}
          </span>
        </FieldError>
      )}
    </div>
  );
}

function ChannexList({ t, value, onPick, onClose }: { t: Dict; value: string; onPick: (c: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target) && target.id !== "chx" && !target.closest("#chx")) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key, true);
    ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"], [role="option"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key, true);
    };
  }, [onClose]);
  const groups: [string, readonly string[], "unit" | "property"][] = [
    [t.vacationRentalHeader, VACATION_RENTAL_TYPES, "unit"],
    [t.hotelHeader, HOTEL_TYPES, "property"],
  ];
  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={t.channexType}
      className="absolute inset-x-0 top-[78px] z-[15] flex max-h-[560px] flex-col overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
    >
      {groups.map(([title, items, billing]) => (
        <div key={title} role="group" aria-label={title} className="flex flex-col">
          <div className="flex min-h-[34px] items-center gap-2 px-2.5 pt-1.5 text-[12px] font-bold text-[#6B7280]">
            <span className="flex-1">{title}</span>
            {billing === "unit" ? <Badge tone="lime">{t.perUnit}</Badge> : <Badge tone="blue">{t.perProperty}</Badge>}
          </div>
          {items.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={value === c}
              onClick={() => onPick(c)}
              className={`flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border-0 px-2.5 text-start text-[14px] text-[#111827] hover:bg-[#F3F4F6] ${
                value === c ? "bg-[#EAF3DE] font-bold" : "bg-transparent font-medium"
              }`}
            >
              <span dir="ltr" className="flex-1 text-start">
                {c}
              </span>
              <span className="w-4 font-bold text-[#3B6D11]">{value === c ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ViewDrawer({ t, lang, type, onClose, onEdit }: { t: Dict; lang: Lang; type: TypeRow; onClose: () => void; onEdit: () => void }) {
  const rows: [string, React.ReactNode][] = [
    [t.groupLabel, t.groupNames[type.group]],
    [t.channexType, <span key="c" dir="ltr" className="font-mono">{type.channexType}</span>],
    [t.rentModeHeading, t.rentModeNames[type.rentMode]],
    [t.colStatus, t.statusNames[type.status]],
    [t.propertiesUsing, String(type.inUse)],
  ];
  return (
    <Drawer
      title={lang === "ar" ? type.nameAr : type.nameEn}
      description={<span className="text-[13px] text-[#6B7280]">{t.typeDetails}</span>}
      closeLabel={t.close}
      onClose={onClose}
      widthClass="min-[900px]:w-[520px]"
      footer={
        <>
          {type.status !== "ARCHIVED" && (
            <button type="button" onClick={onEdit} className={`${smallPrimaryButtonClass} flex-1`}>
              <Pencil />
              {t.edit}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t.close}
          </button>
        </>
      }
    >
      <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-5 min-[900px]:p-6">
        <div>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-[#F3F4F6] py-2.5 text-[14px]">
              <span className="text-[#6B7280]">{k}</span>
              <span className="text-end font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <CostCard t={t} channexType={type.channexType} />
        <section className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">{t.nameOnMainChannels}</span>
          <ul className="m-0 list-none p-0">
            {MAIN_CHANNELS.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 border-b border-[#F3F4F6] py-2 text-[14px]">
                <span className="text-[#6B7280]">{c.name}</span>
                <span dir="ltr" className="font-semibold">
                  {channelName(type.channexType, type.channelNames, c.id)}
                </span>
              </li>
            ))}
          </ul>
          <span className="text-[12px] text-[#6B7280]">{t.moreChannels(CHANNELS.length - MAIN_CHANNELS.length)}</span>
        </section>
      </div>
    </Drawer>
  );
}

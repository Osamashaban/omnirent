"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  inviteUser,
  resendInvite,
  setUserActive,
  updateUser,
  type RowActionResult,
  type UserFormState,
} from "@/app/actions/settings";
import { DICTS, type Dict, type Lang } from "@/lib/i18n";
import { Dialog, Drawer, Toast } from "@/components/ops/Overlay";
import { AlertCircle, Chevron, More, Pencil, Plus, Search, Spinner, UserPlus, Users as UsersIcon } from "@/components/ops/icons";
import {
  FieldError,
  Initials,
  dangerButtonClass,
  inputClass,
  secondaryButtonClass,
  smallPrimaryButtonClass,
} from "@/components/ops/ui";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: "ACTIVE" | "INVITED" | "DEACTIVATED";
  lastLogin: string;
  isMe: boolean;
  isLastSuperAdmin: boolean;
};

type RoleOption = { id: string; name: string; modules: string };
type Filters = { q: string; role: string; status: string };

type Panel = { kind: "add" } | { kind: "edit"; user: UserRow } | { kind: "deactivate"; user: UserRow } | null;

export function UsersView({
  lang,
  rows,
  totalUsers,
  roles,
  filters,
}: {
  lang: Lang;
  rows: UserRow[];
  totalUsers: number;
  roles: RoleOption[];
  filters: Filters;
}) {
  const t = DICTS[lang];
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<React.ReactNode>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const closePanel = useCallback(() => setPanel(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  const onRowResult = (result: RowActionResult) => {
    if (!result.ok) {
      setRowError(result.error ? t[result.error] : t.somethingWrong);
      return;
    }
    setRowError(null);
    if (result.message === "inviteResent")
      setToast(
        <>
          {t.inviteResent}
          <span dir="ltr">{result.email}</span>
        </>,
      );
    else if (result.message) setToast(t[result.message]);
  };

  const filtering = Boolean(filters.q || filters.role || filters.status);
  // New invites show at the top, highlighted, as in the design.
  const ordered = highlight ? [...rows].sort((a, b) => (a.id === highlight ? -1 : b.id === highlight ? 1 : 0)) : rows;

  return (
    <>
      <FilterBar t={t} roles={roles} filters={filters} onAdd={() => setPanel({ kind: "add" })} />

      {rowError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
          <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
          {rowError}
        </div>
      )}

      {rows.length === 0 && filtering ? (
        <NoResults t={t} />
      ) : (
        <>
          <UsersTable t={t} rows={ordered} highlight={highlight} onPanel={setPanel} onRowResult={onRowResult} />
          <UserCards t={t} rows={ordered} highlight={highlight} onPanel={setPanel} onRowResult={onRowResult} />
          {totalUsers === 1 && !filtering && <OnlyYou t={t} onAdd={() => setPanel({ kind: "add" })} />}
        </>
      )}

      {panel?.kind === "add" && (
        <UserForm
          t={t}
          roles={roles}
          onClose={closePanel}
          onDone={(done) => {
            setPanel(null);
            setHighlight(done.userId);
            setToast(
              <>
                {t.userAdded}
                <span dir="ltr">{done.email}</span>
              </>,
            );
          }}
        />
      )}
      {panel?.kind === "edit" && (
        <UserForm
          t={t}
          roles={roles}
          user={panel.user}
          onClose={closePanel}
          onDone={() => {
            setPanel(null);
            setToast(t.userSaved);
          }}
        />
      )}
      {panel?.kind === "deactivate" && (
        <DeactivateDialog
          t={t}
          user={panel.user}
          onClose={closePanel}
          onResult={(result) => {
            setPanel(null);
            onRowResult(result);
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

function FilterBar({ t, roles, filters, onAdd }: { t: Dict; roles: RoleOption[]; filters: Filters; onAdd: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const [, startTransition] = useTransition();
  const first = useRef(true);

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

  const selectClass =
    "h-11 w-full cursor-pointer appearance-none rounded-lg border border-[#D1D5DB] bg-white pe-9 ps-3 text-[14px] font-medium text-[#111827]";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative flex min-w-0 flex-[1_1_calc(100%-56px)] items-center min-[900px]:flex-[0_1_300px]">
        <Search className="pointer-events-none absolute start-3 text-[#6B7280]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t.searchPlaceholder}
          placeholder={t.searchPlaceholder}
          className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pe-3 ps-10 text-[14px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25"
        />
      </label>
      <button type="button" onClick={onAdd} aria-label={t.addUser} className="inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-lg bg-[#639922] text-white hover:bg-[#4E8F20] min-[900px]:hidden">
        <UserPlus />
      </button>
      <div className="relative flex flex-1 items-center min-[900px]:flex-none">
        <select aria-label={t.roleFilter} value={filters.role} onChange={(e) => push({ role: e.target.value })} className={selectClass}>
          <option value="">{t.allRoles}</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <Chevron className="pointer-events-none absolute end-3 text-[#6B7280]" />
      </div>
      <div className="relative flex flex-1 items-center min-[900px]:flex-none">
        <select aria-label={t.statusFilter} value={filters.status} onChange={(e) => push({ status: e.target.value })} className={selectClass}>
          <option value="">{t.allStatuses}</option>
          <option value="ACTIVE">{t.statusACTIVE}</option>
          <option value="INVITED">{t.statusINVITED}</option>
          <option value="DEACTIVATED">{t.statusDEACTIVATED}</option>
        </select>
        <Chevron className="pointer-events-none absolute end-3 text-[#6B7280]" />
      </div>
      <span className="ms-auto hidden min-[900px]:block" />
      <button type="button" onClick={onAdd} className={`${smallPrimaryButtonClass} max-[899px]:hidden`}>
        <Plus />
        {t.addUser}
      </button>
    </div>
  );
}

function StatusBadge({ t, status }: { t: Dict; status: UserRow["status"] }) {
  const tone = {
    ACTIVE: "bg-[#DCFCE7] text-[#15803D]",
    INVITED: "bg-[#FEF3C7] text-[#B45309]",
    DEACTIVATED: "bg-[#F3F4F6] text-[#4B5563]",
  }[status];
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t[`status${status}`]}
    </span>
  );
}

function RoleBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-md bg-[#F3F4F6] px-2.5 text-[12px] font-semibold text-[#374151]">
      {name}
    </span>
  );
}

function YouTag({ t }: { t: Dict }) {
  return <span className="rounded-full bg-[#EAF3DE] px-2 py-px text-[11px] font-bold text-[#3B6D11]">{t.you}</span>;
}

type RowProps = {
  t: Dict;
  rows: UserRow[];
  highlight: string | null;
  onPanel: (p: Panel) => void;
  onRowResult: (r: RowActionResult) => void;
};

function UsersTable({ t, rows, highlight, onPanel, onRowResult }: RowProps) {
  const th = "border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]";
  const td = "border-b border-[#F3F4F6] px-4 py-3 align-middle text-[14px]";
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] min-[900px]:block">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr>
            <th className={th}>{t.colName}</th>
            <th className={th}>{t.colEmail}</th>
            <th className={th}>{t.colRole}</th>
            <th className={th}>{t.colStatus}</th>
            <th className={th}>{t.colLastLogin}</th>
            <th className={th}>
              <span className="sr-only">{t.colActions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className={u.id === highlight ? "bg-[#F7FBF1]" : undefined}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <Initials name={u.name} muted={u.status === "DEACTIVATED"} />
                  <span className={`font-semibold ${u.status === "DEACTIVATED" ? "text-[#6B7280]" : "text-[#111827]"}`}>{u.name}</span>
                  {u.isMe && <YouTag t={t} />}
                </div>
              </td>
              <td className={`${td} text-[#4B5563]`}>
                <span dir="ltr">{u.email}</span>
              </td>
              <td className={td}>
                <RoleBadge name={u.roleName} />
              </td>
              <td className={td}>
                <StatusBadge t={t} status={u.status} />
              </td>
              <td className={`${td} whitespace-nowrap text-[#4B5563]`}>{u.status === "INVITED" ? "—" : u.lastLogin}</td>
              <td className={`${td} w-14`}>
                {u.isMe ? <span className="block w-10" /> : <RowMenu t={t} user={u} onPanel={onPanel} onRowResult={onRowResult} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 text-[13px] text-[#6B7280]">{t.userCount(rows.length)}</div>
    </div>
  );
}

function UserCards({ t, rows, highlight, onPanel, onRowResult }: RowProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[900px]:hidden">
      {rows.map((u) => (
        <li
          key={u.id}
          className={`flex gap-3 rounded-xl border border-[#E5E7EB] py-3.5 pe-1 ps-3 ${u.id === highlight ? "bg-[#F7FBF1]" : "bg-white"}`}
        >
          <Initials name={u.name} muted={u.status === "DEACTIVATED"} size={40} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold">{u.name}</span>
              {u.isMe && <YouTag t={t} />}
            </div>
            <span dir="ltr" className="truncate text-[13px] text-[#4B5563] rtl:text-right">
              {u.email}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <RoleBadge name={u.roleName} />
              <StatusBadge t={t} status={u.status} />
            </div>
          </div>
          {!u.isMe && <RowMenu t={t} user={u} onPanel={onPanel} onRowResult={onRowResult} />}
        </li>
      ))}
    </ul>
  );
}

function RowMenu({
  t,
  user,
  onPanel,
  onRowResult,
}: {
  t: Dict;
  user: UserRow;
  onPanel: (p: Panel) => void;
  onRowResult: (r: RowActionResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-start text-[14px] font-medium hover:bg-[#F3F4F6]";
  const run = (fn: () => Promise<RowActionResult>) => {
    setOpen(false);
    startTransition(async () => onRowResult(await fn()));
  };

  return (
    <div ref={ref} className="relative ms-auto">
      <button
        type="button"
        aria-label={t.optionsFor(user.name)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
      >
        {pending ? <Spinner /> : <More />}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t.optionsFor(user.name)}
          className="absolute end-0 top-11 z-20 flex w-[220px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <button type="button" role="menuitem" className={item} onClick={() => (setOpen(false), onPanel({ kind: "edit", user }))}>
            <Pencil />
            {t.edit}
          </button>
          {user.status === "INVITED" && (
            <button type="button" role="menuitem" className={item} onClick={() => run(() => resendInvite(user.id))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {t.resendInvite}
            </button>
          )}
          {user.status === "DEACTIVATED" ? (
            <button type="button" role="menuitem" className={item} onClick={() => run(() => setUserActive(user.id, true))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {t.reactivate}
            </button>
          ) : (
            !user.isLastSuperAdmin && (
              <button
                type="button"
                role="menuitem"
                className={`${item} text-[#B91C1C] hover:bg-[#FEE2E2]`}
                onClick={() => (setOpen(false), onPanel({ kind: "deactivate", user }))}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.9 4.9 14.2 14.2" />
                </svg>
                {t.deactivate}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function DeactivateDialog({
  t,
  user,
  onClose,
  onResult,
}: {
  t: Dict;
  user: UserRow;
  onClose: () => void;
  onResult: (r: RowActionResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      title={t.deactivateTitle(user.name)}
      onClose={onClose}
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
          <AlertCircle size={24} />
        </div>
      }
      actions={
        <>
          <button
            type="button"
            disabled={pending}
            className={`${dangerButtonClass} flex-1`}
            onClick={() => startTransition(async () => onResult(await setUserActive(user.id, false)))}
          >
            {pending && <Spinner />}
            {t.deactivate}
          </button>
          <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={onClose}>
            {t.cancel}
          </button>
        </>
      }
    >
      {t.deactivateBody(user.name)}
    </Dialog>
  );
}

function UserForm({
  t,
  roles,
  user,
  onClose,
  onDone,
}: {
  t: Dict;
  roles: RoleOption[];
  user?: UserRow;
  onClose: () => void;
  onDone: (done: NonNullable<UserFormState["done"]>) => void;
}) {
  const editing = Boolean(user);
  const [state, action, pending] = useActionState<UserFormState, FormData>(editing ? updateUser : inviteUser, {
    values: user ? { name: user.name, email: user.email, roleId: user.roleId } : { name: "", email: "", roleId: "" },
  });
  const [roleId, setRoleId] = useState(state.values?.roleId ?? "");
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (state.done && handled.current !== state.done.at) {
      handled.current = state.done.at;
      onDone(state.done);
    }
  }, [state.done, onDone]);

  const selected = roles.find((r) => r.id === roleId);
  const values = state.values ?? { name: "", email: "", roleId: "" };
  const lockRole = Boolean(user && (user.isMe || user.isLastSuperAdmin));

  return (
    <form action={action} className="contents">
      <Drawer
        title={editing ? t.editUser : t.addUser}
        description={editing ? t.editUserBody : t.addUserBody}
        closeLabel={t.close}
        onClose={onClose}
        footer={
          <>
            <button type="submit" disabled={pending} className={`${smallPrimaryButtonClass} flex-1`}>
              {pending && <Spinner />}
              {editing ? t.saveChanges : t.saveUser}
            </button>
            <button type="button" onClick={onClose} className={`${secondaryButtonClass} flex-1`}>
              {t.cancel}
            </button>
          </>
        }
      >
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 min-[900px]:p-6">
          {user && <input type="hidden" name="userId" value={user.id} />}
          {state.formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
              <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
              {t[state.formError]}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="uname" className="text-[14px] font-medium">
              {t.fullName}
            </label>
            <input
              id="uname"
              name="name"
              defaultValue={values.name}
              autoComplete="off"
              aria-invalid={state.nameError ? true : undefined}
              aria-describedby={state.nameError ? "uname-error" : undefined}
              className={inputClass}
            />
            {state.nameError && <FieldError id="uname-error">{t[state.nameError]}</FieldError>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="uemail" className="text-[14px] font-medium">
              {t.email}
            </label>
            <input
              id="uemail"
              name="email"
              type="email"
              dir="ltr"
              defaultValue={values.email}
              readOnly={editing}
              autoComplete="off"
              placeholder="name@getomnirent.com"
              aria-invalid={state.emailError ? true : undefined}
              aria-describedby={state.emailError ? "uemail-error" : undefined}
              className={`${inputClass} rtl:text-right read-only:bg-[#F3F4F6] read-only:text-[#4B5563]`}
            />
            {state.emailError && <FieldError id="uemail-error">{t[state.emailError]}</FieldError>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="urole" className="text-[14px] font-medium">
              {t.role}
            </label>
            <div className="relative flex items-center">
              <select
                id="urole"
                name="roleId"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={lockRole}
                aria-invalid={state.roleError ? true : undefined}
                aria-describedby="urole-help"
                className={`${inputClass} cursor-pointer appearance-none pe-10`}
              >
                <option value="" disabled>
                  {t.chooseRole}
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {lockRole && <input type="hidden" name="roleId" value={roleId} />}
              <Chevron className="pointer-events-none absolute end-3.5 text-[#6B7280]" />
            </div>
            <span id="urole-help" className={`text-[13px] ${state.roleError ? "text-[#B91C1C]" : "text-[#6B7280]"}`}>
              {state.roleError
                ? t[state.roleError]
                : lockRole
                  ? user?.isMe
                    ? t.cannotChangeSelf
                    : t.lastSuperAdmin
                  : selected
                    ? `${t.reaches} ${selected.modules}`
                    : ""}
            </span>
          </div>
        </div>
      </Drawer>
    </form>
  );
}

function NoResults({ t }: { t: Dict }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center">
      <Search size={28} className="text-[#9CA3AF]" />
      <p className="m-0 text-[16px] font-semibold">{t.noResults}</p>
      <button type="button" className={secondaryButtonClass} onClick={() => router.replace(pathname)}>
        {t.clearSearch}
      </button>
    </div>
  );
}

function OnlyYou({ t, onAdd }: { t: Dict; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
        <UsersIcon />
      </div>
      <p className="m-0 text-[17px] font-semibold">{t.onlyYouTitle}</p>
      <p className="m-0 max-w-[420px] text-[14px] leading-[1.6] text-[#4B5563]">{t.onlyYouBody}</p>
      <button type="button" onClick={onAdd} className={smallPrimaryButtonClass}>
        <Plus />
        {t.addUser}
      </button>
    </div>
  );
}

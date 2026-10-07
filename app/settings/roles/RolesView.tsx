"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteRole, saveRole, type RoleFormState } from "@/app/actions/settings";
import { DICTS, type Dict, type Lang } from "@/lib/i18n";
import { Dialog, Drawer, Toast } from "@/components/ops/Overlay";
import { AlertCircle, Check, Info, Lock, Pencil, Plus, Spinner, Trash } from "@/components/ops/icons";
import {
  FieldError,
  dangerButtonClass,
  inputClass,
  secondaryButtonClass,
  smallPrimaryButtonClass,
} from "@/components/ops/ui";

type RoleRow = {
  id: string;
  name: string;
  isProtected: boolean;
  userCount: number;
  moduleIds: string[];
  moduleNames: string[];
};
type ModuleOption = { id: string; name: string; description: string };
type Panel = { kind: "create" } | { kind: "edit"; role: RoleRow } | { kind: "delete"; role: RoleRow } | null;

export function RolesView({ lang, roles, modules }: { lang: Lang; roles: RoleRow[]; modules: ModuleOption[] }) {
  const t = DICTS[lang];
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const close = useCallback(() => setPanel(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 hidden flex-1 text-[14px] text-[#4B5563] min-[900px]:block">{t.rolesIntro}</p>
        <button type="button" onClick={() => setPanel({ kind: "create" })} className={`${smallPrimaryButtonClass} max-[899px]:w-full`}>
          <Plus />
          {t.createRole}
        </button>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] min-[900px]:block">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              {[t.colRole, t.colModules, t.colUsers].map((h) => (
                <th key={h} className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]">
                  {h}
                </th>
              ))}
              <th className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                <span className="sr-only">{t.colActions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className={role.id === highlight ? "bg-[#F7FBF1]" : undefined}>
                <td className="border-b border-[#F3F4F6] px-4 py-3 text-[14px]">
                  <RoleName t={t} role={role} />
                </td>
                <td className="border-b border-[#F3F4F6] px-4 py-3 text-[14px]">
                  <ModuleChips names={role.moduleNames} />
                </td>
                <td className="border-b border-[#F3F4F6] px-4 py-3 text-[14px] text-[#4B5563]">{role.userCount}</td>
                <td className="w-40 border-b border-[#F3F4F6] px-4 py-3 text-[14px]">
                  <RoleActions t={t} role={role} onPanel={setPanel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[900px]:hidden">
        {[...roles]
          .sort((a, b) => (a.id === highlight ? -1 : b.id === highlight ? 1 : 0))
          .map((role) => (
            <li
              key={role.id}
              className={`flex flex-col gap-2.5 rounded-xl border p-3.5 ${
                role.id === highlight ? "border-[#C0DD97] bg-[#F7FBF1]" : "border-[#E5E7EB] bg-white"
              }`}
            >
              <div className="flex min-h-11 items-center gap-2">
                <RoleName t={t} role={role} />
                {!role.isProtected && (
                  <span className="ms-auto">
                    <RoleActions t={t} role={role} onPanel={setPanel} />
                  </span>
                )}
              </div>
              <ModuleChips names={role.moduleNames} />
              <span className="text-[13px] text-[#6B7280]">{role.userCount === 0 ? t.noUsersYet : t.userCount(role.userCount)}</span>
            </li>
          ))}
      </ul>

      {(panel?.kind === "create" || panel?.kind === "edit") && (
        <RoleEditor
          t={t}
          role={panel.kind === "edit" ? panel.role : undefined}
          modules={modules}
          onClose={close}
          onDone={(saved) => {
            setPanel(null);
            setHighlight(saved.roleId);
            setToast(t.roleSaved(saved.name));
          }}
        />
      )}
      {panel?.kind === "delete" && (
        <DeleteRoleDialog
          t={t}
          role={panel.role}
          onClose={close}
          onDeleted={() => {
            setPanel(null);
            setToast(t.roleDeleted);
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

function RoleName({ t, role }: { t: Dict; role: RoleRow }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-semibold">{role.name}</span>
      {role.isProtected && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[12px] font-semibold text-[#4B5563]">
          <Lock />
          {t.protected}
        </span>
      )}
    </div>
  );
}

function ModuleChips({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full border border-[#C0DD97] bg-[#F7FBF1] px-2.5 text-[12px] font-semibold text-[#27500A]"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function RoleActions({ t, role, onPanel }: { t: Dict; role: RoleRow; onPanel: (p: Panel) => void }) {
  if (role.isProtected) return <span className="text-[13px] text-[#6B7280]">{t.allModulesAuto}</span>;
  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label={t.editRoleLabel(role.name)}
        onClick={() => onPanel({ kind: "edit", role })}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
      >
        <Pencil />
      </button>
      <button
        type="button"
        aria-label={t.deleteRoleLabel(role.name)}
        onClick={() => onPanel({ kind: "delete", role })}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#B91C1C] hover:bg-[#FEE2E2]"
      >
        <Trash />
      </button>
    </div>
  );
}

function RoleEditor({
  t,
  role,
  modules,
  onClose,
  onDone,
}: {
  t: Dict;
  role?: RoleRow;
  modules: ModuleOption[];
  onClose: () => void;
  onDone: (saved: NonNullable<RoleFormState["done"]>) => void;
}) {
  const [state, action, pending] = useActionState<RoleFormState, FormData>(saveRole, {
    values: { name: role?.name ?? "", moduleIds: role?.moduleIds ?? [] },
  });
  const [ticked, setTicked] = useState<string[]>(state.values?.moduleIds ?? []);
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (state.done && handled.current !== state.done.at) {
      handled.current = state.done.at;
      onDone(state.done);
    }
  }, [state.done, onDone]);

  const toggle = (id: string) => setTicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form action={action} className="contents">
      <Drawer
        title={role ? t.editRole : t.createRole}
        description={t.roleEditorBody}
        closeLabel={t.close}
        onClose={onClose}
        footer={
          <>
            <button type="submit" disabled={pending} className={`${smallPrimaryButtonClass} flex-1`}>
              {pending && <Spinner />}
              {t.saveRole}
            </button>
            <button type="button" onClick={onClose} className={`${secondaryButtonClass} flex-1`}>
              {t.cancel}
            </button>
          </>
        }
      >
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 min-[900px]:p-6">
          {role && <input type="hidden" name="roleId" value={role.id} />}
          {state.formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
              <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
              {t[state.formError]}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rname" className="text-[14px] font-medium">
              {t.roleName}
            </label>
            <input
              id="rname"
              name="name"
              defaultValue={state.values?.name}
              autoComplete="off"
              aria-invalid={state.nameError ? true : undefined}
              aria-describedby={state.nameError ? "rname-error" : undefined}
              className={inputClass}
            />
            {state.nameError && <FieldError id="rname-error">{t[state.nameError]}</FieldError>}
          </div>
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0" aria-describedby="modules-help">
            <legend className="mb-1 p-0 text-[14px] font-medium">{t.roleModules}</legend>
            {modules.map((m) => {
              const on = ticked.includes(m.id);
              return (
                <label
                  key={m.id}
                  className={`relative flex cursor-pointer items-start gap-3 rounded-[10px] p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#639922]/40 ${
                    on ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="moduleIds"
                    value={m.id}
                    checked={on}
                    onChange={() => toggle(m.id)}
                    className="absolute h-px w-px opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md ${
                      on ? "bg-[#639922] text-white" : "border-[1.5px] border-[#9CA3AF] bg-white"
                    }`}
                  >
                    {on && <Check />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{m.name}</span>
                    <span className="text-[13px] text-[#6B7280]">{m.description}</span>
                  </span>
                </label>
              );
            })}
            <span id="modules-help" className={`text-[13px] ${state.modulesError ? "text-[#B91C1C]" : "text-[#6B7280]"}`}>
              {t.pickOneModule}
            </span>
          </fieldset>
          <div className="flex gap-2.5 rounded-lg bg-[#F3F4F6] px-3.5 py-3 text-[13px] leading-[1.6] text-[#4B5563]">
            <Info className="flex-none" />
            <span>
              <span dir="ltr">Super Admin</span> {t.superAdminGetsNew}
            </span>
          </div>
        </div>
      </Drawer>
    </form>
  );
}

function DeleteRoleDialog({
  t,
  role,
  onClose,
  onDeleted,
}: {
  t: Dict;
  role: RoleRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [blockedCount, setBlockedCount] = useState(role.userCount);

  if (blockedCount > 0) {
    return (
      <Dialog
        title={t.deleteBlockedTitle(role.name)}
        onClose={onClose}
        icon={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]">
            <AlertCircle size={24} />
          </div>
        }
        actions={
          <>
            <Link href={`/settings/users?role=${encodeURIComponent(role.id)}`} className={`${smallPrimaryButtonClass} flex-1`}>
              {t.viewUsers}
            </Link>
            <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={onClose}>
              {t.close}
            </button>
          </>
        }
      >
        {t.deleteBlockedBody(blockedCount)}
      </Dialog>
    );
  }

  return (
    <Dialog
      title={t.deleteRoleTitle(role.name)}
      onClose={onClose}
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
          <Trash size={22} />
        </div>
      }
      actions={
        <>
          <button
            type="button"
            disabled={pending}
            className={`${dangerButtonClass} flex-1`}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteRole(role.id);
                if (result.ok) onDeleted();
                else setBlockedCount(result.userCount ?? 1);
              })
            }
          >
            {pending && <Spinner />}
            {t.deleteRole}
          </button>
          <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={onClose}>
            {t.cancel}
          </button>
        </>
      }
    >
      {t.deleteRoleBody}
    </Dialog>
  );
}

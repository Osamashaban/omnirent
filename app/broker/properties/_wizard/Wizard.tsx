"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishProperty, saveProperty } from "@/app/actions/properties";
import type { Lang } from "@/lib/i18n";
import { CHANNEL_DICTS } from "@/lib/channel-i18n";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { STEP_COUNT, checkStep, pricedUnits, type FormErrors, type PropertyForm, type StepContext } from "@/lib/property-rules";
import { AlertCircle, Check, Spinner } from "@/components/ops/icons";
import { secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";
import { StepBasics } from "./StepBasics";
import { StepLocation } from "./StepLocation";
import { StepUnits } from "./StepUnits";
import { StepPricing } from "./StepPricing";
import { StepPolicies } from "./StepPolicies";
import { StepTaxes } from "./StepTaxes";
import { StepContent } from "./StepContent";
import { StepReview } from "./StepReview";
import type { StepProps, WizardOptions } from "./types";
import { PublishDialog } from "../Publish";

type Props = {
  lang: Lang;
  options: WizardOptions;
  id: string | null;
  initialForm: PropertyForm;
  stepsDone: number;
  startStep: number;
  ratesSaved: boolean;
  // Channex is set up on this server, so "Save and publish" works.
  canPublish: boolean;
};

// The 8-step Add property wizard. "Next" checks the step, saves the whole
// property and moves on, so a broker can stop at any point and come back.
// "Save as draft" saves without checking (only a nickname is needed). The
// last step's "Save and publish" saves, then sends the property to Channex
// and shows the progress.
export function Wizard({ lang, options, id: initialId, initialForm, stepsDone: initialDone, startStep, ratesSaved: initialRatesSaved, canPublish }: Props) {
  const p = PROPERTY_DICTS[lang];
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [id, setId] = useState(initialId);
  const [step, setStep] = useState(startStep);
  const [stepsDone, setStepsDone] = useState(initialDone);
  const [ratesSaved, setRatesSaved] = useState(initialRatesSaved);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<"next" | "draft" | "publish" | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(initialId));

  const ctx: StepContext = useMemo(
    () => ({
      typeIds: options.types.map((t) => t.id),
      countries: options.countries.map((c) => ({ id: c.id, currency: c.currency, cityIds: c.cities.map((x) => x.id) })),
    }),
    [options],
  );
  const update = useCallback((change: (f: PropertyForm) => PropertyForm) => setForm(change), []);

  // Once a mistake is fixed its message goes away; new ones only show on Next.
  useEffect(() => {
    setErrors((prev) => {
      const keys = Object.keys(prev);
      if (!keys.length) return prev;
      const now = checkStep(step, form, ctx);
      const left = Object.fromEntries(keys.filter((k) => now[k]).map((k) => [k, now[k]]));
      return Object.keys(left).length === keys.length && keys.every((k) => left[k] === prev[k]) ? prev : left;
    });
  }, [form, step, ctx]);
  const reachable = Math.min(STEP_COUNT, Math.max(stepsDone + 1, step));

  const goTo = (s: number) => {
    if (s < 1 || s > reachable) return;
    setStep(s);
    setErrors({});
    setNotice(null);
    window.scrollTo({ top: 0 });
  };

  const save = async (mode: "next" | "draft") => {
    if (mode === "next") {
      const e = checkStep(step, form, ctx);
      if (Object.keys(e).length) {
        setErrors(e);
        setNotice(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    } else if (!form.nickname.trim()) {
      setErrors({ nickname: "required" });
      setNotice(p.nicknameForDraft);
      if (step !== 1) setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(mode);
    try {
      const result = await saveProperty({ id, step, mode, form });
      if (!result.ok) {
        if ("errors" in result) {
          setErrors(result.errors);
          setNotice(null);
        } else if (result.error === "signedOut") {
          router.push("/broker/login");
        } else {
          setNotice(result.error === "unitBooked" ? CHANNEL_DICTS[lang].unitDeleteBlocked : p.saveFailed);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setForm(result.form);
      setId(result.id);
      setStepsDone(result.stepsDone);
      setSaved(true);
      setErrors({});
      setNotice(null);
      setRatesSaved(result.stepsDone >= 4);
      if (mode === "draft") {
        router.push("/broker/properties?done=draft");
        router.refresh();
        return;
      }
      const next = Math.min(step + 1, STEP_COUNT);
      // Keep the address in step with the saved property, so a refresh reopens it.
      if (!id || next !== step) {
        const base = window.location.pathname.replace(/\/properties\/(new|[^/]+\/edit)$/, `/properties/${result.id}/edit`);
        window.history.replaceState(null, "", `${base}?step=${next}`);
      }
      setStep(next);
      window.scrollTo({ top: 0 });
    } catch {
      setNotice(p.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  // Saves like "Next", then starts the publish and shows its progress.
  const publish = async () => {
    const e = checkStep(step, form, ctx);
    if (Object.keys(e).length) {
      setErrors(e);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving("publish");
    setNotice(null);
    try {
      const saved = await saveProperty({ id, step, mode: "next", form });
      if (!saved.ok) {
        if ("errors" in saved) setErrors(saved.errors);
        else if (saved.error === "signedOut") return router.push("/broker/login");
        else setNotice(saved.error === "unitBooked" ? CHANNEL_DICTS[lang].unitDeleteBlocked : p.saveFailed);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setForm(saved.form);
      setId(saved.id);
      setStepsDone(saved.stepsDone);
      setSaved(true);
      const res = await publishProperty(saved.id);
      if (res.ok) return setPublishing(saved.id);
      if (res.error === "signedOut") return router.push("/broker/login");
      setNotice(res.error === "incomplete" ? p.publishIncomplete : res.error === "busy" ? p.publishBusy : p.saveFailed);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setNotice(p.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  const errorCount = Object.keys(errors).length;
  const stepProps: StepProps = { form, update, errors, p, lang, options, ratesSaved, goTo };
  const title = id ? p.editTitle : p.addTitle;
  const nextLabel = step === 6 && form.taxes.length === 0 ? p.skip : p.next;

  return (
    <div className="flex flex-col gap-6 max-[899px]:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3 max-[899px]:hidden">
        <div className="flex min-w-0 flex-col gap-1.5">
          <nav className="text-[13px] text-[#4B5563]">
            <Link href="/broker/properties" className="text-[#4B5563] no-underline hover:underline">
              {p.properties}
            </Link>
            {" / "}
            {id ? form.nickname || p.newProperty : p.addTitle}
          </nav>
          <h1 className="m-0 truncate text-[28px] font-bold tracking-[-0.01em]">
            {title}
            <span className="font-medium text-[#6B7280]"> · {form.nickname.trim() || p.newProperty}</span>
          </h1>
        </div>
        {saved && (
          <div className="flex items-center gap-3 text-[13px] text-[#4B5563]">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 text-[12px] font-semibold text-[#4B5563]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {p.draft}
            </span>
            {p.draftSaved}
          </div>
        )}
      </div>

      {/* Phone: step name, "Step n of 8" and a progress bar. */}
      <div className="-mx-4 -mt-4 flex flex-col gap-2 border-b border-[#E5E7EB] bg-white px-4 py-3 min-[900px]:hidden">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-bold">{p.steps[step - 1]}</span>
          <span className="text-[#4B5563]">{p.stepOf(step)}</span>
        </div>
        <span className="block h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
          <span className="block h-full rounded-full bg-[#639922]" style={{ width: `${(step / STEP_COUNT) * 100}%` }} />
        </span>
      </div>

      <div className="flex items-start gap-6">
        <nav aria-label={p.stepsLabel} className="sticky top-6 hidden w-[264px] flex-none rounded-xl border border-[#E5E7EB] bg-white p-4 min-[900px]:block">
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {p.steps.map((label, i) => {
              const s = i + 1;
              const done = s <= stepsDone && s !== step;
              const current = s === step;
              const canGo = s <= reachable;
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => goTo(s)}
                    disabled={!canGo}
                    aria-current={current ? "step" : undefined}
                    className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-start disabled:cursor-not-allowed"
                  >
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ${
                        done
                          ? "bg-[#639922] text-white"
                          : current
                            ? "border-2 border-[#639922] bg-[#EAF3DE] text-[#27500A]"
                            : "border-[1.5px] border-[#D1D5DB] text-[#6B7280]"
                      }`}
                    >
                      {done ? <Check size={14} /> : s}
                    </span>
                    <span className={`text-[14px] ${current ? "font-bold text-[#27500A]" : canGo ? "font-medium text-[#111827]" : "font-medium text-[#6B7280]"}`}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {(errorCount > 0 || notice) && (
            <div role="alert" className="flex gap-3 rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-4 py-3.5">
              <AlertCircle size={20} className="mt-0.5 flex-none text-[#B91C1C]" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[#B91C1C]">{notice && !errorCount ? notice : p.completeRequired}</span>
                {errorCount > 0 && <span className="text-[13px] text-[#1F2937]">{notice ?? p.errCount(errorCount)}</span>}
              </div>
            </div>
          )}

          {step === 1 && <StepBasics {...stepProps} />}
          {step === 2 && <StepLocation {...stepProps} />}
          {step === 3 && <StepUnits {...stepProps} />}
          {step === 4 && <StepPricing {...stepProps} />}
          {step === 5 && <StepPolicies {...stepProps} />}
          {step === 6 && <StepTaxes {...stepProps} />}
          {step === 7 && <StepContent {...stepProps} />}
          {step === 8 && <StepReview {...stepProps} ctx={ctx} />}

          {step === STEP_COUNT && !canPublish && <p className="m-0 text-[13px] text-[#4B5563]">{p.publishLater}</p>}

          <div className="flex items-center gap-3 max-[899px]:fixed max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:z-30 max-[899px]:border-t max-[899px]:border-[#E5E7EB] max-[899px]:bg-white max-[899px]:p-4">
            {step === 1 ? (
              <Link href="/broker/properties" className={secondaryButtonClass}>
                {p.back}
              </Link>
            ) : (
              <button type="button" onClick={() => goTo(step - 1)} className={secondaryButtonClass}>
                {p.back}
              </button>
            )}
            <span className="flex-1 max-[899px]:hidden" />
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={saving !== null}
              className="inline-flex h-11 cursor-pointer items-center gap-2 px-3 text-[15px] font-semibold text-[#3B6D11] disabled:opacity-60 max-[899px]:hidden"
            >
              {saving === "draft" && <Spinner />}
              {p.saveDraft}
            </button>
            {step < STEP_COUNT ? (
              <button type="button" onClick={() => save("next")} disabled={saving !== null} className={`${smallPrimaryButtonClass} max-[899px]:flex-1`}>
                {saving === "next" && <Spinner />}
                {nextLabel}
              </button>
            ) : canPublish ? (
              <button type="button" onClick={publish} disabled={saving !== null} className={`${smallPrimaryButtonClass} max-[899px]:flex-1`}>
                {saving === "publish" && <Spinner />}
                {p.savePublish}
              </button>
            ) : (
              <button type="button" disabled title={p.publishLater} className={`${smallPrimaryButtonClass} max-[899px]:flex-1`}>
                {p.savePublish}
              </button>
            )}
          </div>
        </div>
      </div>
      {publishing && <PublishDialog lang={lang} propertyId={publishing} counts={{ units: pricedUnits(form).length, rates: pricedUnits(form).reduce((n, { unit }) => n + (unit.rate.derived ? 2 : 1), 0) }} />}
    </div>
  );
}

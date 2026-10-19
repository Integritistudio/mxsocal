/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, type FormEvent } from "react";
import { useAlert } from "@/context/AlertContext";
import { addCoach, updateCoachById } from "@/services/coach";
import type { AddCoachProps } from "@/utils/types";
import { Modal } from "../ui/modal";
import s from "../products/admin-products.module.css";

type Props = { isOpen: boolean; isEditMode?: boolean; coachData?: AddCoachProps | null; onClose: () => void; loadCoaches?: () => Promise<void> };
const textFields = [
  ["firstName", "First name", "text"], ["lastName", "Last name", "text"], ["email", "Email address (private)", "email"], ["phone", "Phone (private)", "tel"],
  ["specialty", "Specialty", "text"], ["experienceLabel", "Experience text", "text"], ["experience", "Experience in years", "number"], ["hourlyRate", "Hourly rate ($)", "number"], ["displayOrder", "Display order", "number"],
  ["country", "Country", "text"], ["state", "State / province", "text"], ["city", "City", "text"], ["zipCode", "ZIP / postal code", "text"],
  ["facebook", "Facebook URL", "url"], ["instagram", "Instagram URL", "url"], ["linkedin", "LinkedIn URL", "url"], ["xcom", "X URL", "url"],
];
export default function AddCoach(props: Props) { return props.isOpen ? <CoachEditor key={props.coachData?.id || "new"} {...props} /> : null; }
function CoachEditor({ isEditMode, coachData, onClose, loadCoaches }: Props) {
  const { showAlert } = useAlert();
  const [data, setData] = useState<Record<string, string>>(() => {
    const source = (coachData || {}) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const key of [...textFields.map(field => field[0]), "bio", "profileImage"]) result[key] = String(source[key] ?? "");
    result.skills = Array.isArray(source.skills) ? source.skills.join("\n") : "";
    const crop = source.imagePresentation as { height?: number; top?: number } | null;
    result.imageHeight = String(crop?.height ?? 100); result.imageTop = String(crop?.top ?? 0);
    return result;
  });
  const [levels, setLevels] = useState<string[]>(() => { const value = (coachData as Record<string, unknown> | null)?.coachingLevels; return Array.isArray(value) ? value : []; });
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  const change = (key: string, value: string) => setData(previous => ({ ...previous, [key]: value }));
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png"].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name) || file.size >= 5 * 1024 * 1024) { setError("Choose one JPG or PNG photo under 5 MB."); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append("images", file);
      const response = await fetch("/api/coach-photo", { method: "POST", body }); const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to upload this photo.");
      setData(previous => ({ ...previous, profileImage: result.profileImage, imageHeight: "100", imageTop: "0" }));
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to upload this photo."); } finally { setUploading(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!["firstName", "lastName", "email"].every(key => data[key]?.trim())) { setError("First name, last name, and email are required."); return; }
    const { skills, imageHeight, imageTop, ...values } = data;
    const payload = { ...values, skills: skills.split("\n").map(value => value.trim()).filter(Boolean), coachingLevels: levels, imagePresentation: { height: Number(imageHeight), top: Number(imageTop) } };
    setBusy(true);
    try {
      if (isEditMode && coachData?.id) await updateCoachById(coachData.id, payload); else await addCoach(payload);
      await loadCoaches?.(); showAlert("success", isEditMode ? "Coach updated successfully" : "Coach added successfully"); onClose();
    } catch (error) { const response = (error as { response?: { data?: { message?: string } } }).response; setError(response?.data?.message || "Unable to save this coach. Please try again."); } finally { setBusy(false); }
  }
  return <Modal isOpen onClose={() => { if (!busy && !uploading) onClose(); }} className="max-w-[850px] m-4"><div className="rounded-3xl bg-white p-5 dark:bg-gray-900 lg:p-9"><h2 className="mb-5 text-2xl font-semibold text-gray-900 dark:text-white">{isEditMode ? "Edit Coach" : "Add Coach"}</h2><form onSubmit={save} className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar"><fieldset disabled={busy || uploading} className={s.grid}>
    <div className={s.full}><h3 className="mb-3 font-semibold dark:text-white">Coach photo</h3><div className="flex flex-wrap items-start gap-5">{data.profileImage && <div style={{ width: 160, height: 190, position: "relative", overflow: "hidden", borderRadius: 12, background: "#eee" }}><img src={data.profileImage} alt="Coach photo preview" style={{ position: "absolute", width: "100%", height: `${data.imageHeight}%`, top: `${data.imageTop}%`, objectFit: "cover" }} /></div>}<div className="flex-1 space-y-3"><label className={s.field}>Upload photo<input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label><p className={s.hint}>{uploading ? "Uploading photo…" : "One JPG or PNG, under 5 MB."}</p>{data.profileImage && <button type="button" className={`${s.button} ${s.secondary}`} onClick={() => change("profileImage", "")}>Remove photo</button>}</div></div></div>
    <label className={s.field}>Photo height (%)<input type="number" min={100} max={250} step="any" value={data.imageHeight} onChange={event => change("imageHeight", event.target.value)} /></label><label className={s.field}>Photo vertical offset (%)<input type="number" min={-100} max={0.1} step="any" value={data.imageTop} onChange={event => change("imageTop", event.target.value)} /></label>
    {textFields.map(([key, label, type]) => <label className={s.field} key={key}>{label}{["firstName", "lastName", "email"].includes(key) ? " *" : ""}<input name={key} type={type} value={data[key]} required={["firstName", "lastName", "email"].includes(key)} maxLength={key === "email" ? 254 : key === "experienceLabel" || type === "url" ? 255 : key === "phone" ? 25 : key === "zipCode" ? 20 : 100} min={type === "number" ? 0 : undefined} step={key === "hourlyRate" ? "0.01" : type === "number" ? "1" : undefined} onChange={event => change(key, event.target.value)} placeholder={key === "experienceLabel" ? "10+ years riding and coaching" : key === "specialty" ? "Motocross Racing Techniques" : undefined} /></label>)}
    <label className={`${s.field} ${s.full}`}>Skills (one per line)<textarea value={data.skills} onChange={event => change("skills", event.target.value)} placeholder={"Jump control & landing techniques\nRace track cornering\nSpeed and throttle control"} /></label>
    <fieldset className={s.full}><legend className="mb-3 text-sm dark:text-white">Coaching levels</legend><div className="flex flex-wrap gap-5">{["Beginner", "Intermediate", "Advanced"].map(level => <label key={level} className="flex items-center gap-2 text-sm dark:text-white"><input type="checkbox" checked={levels.includes(level)} onChange={event => setLevels(previous => event.target.checked ? [...previous, level] : previous.filter(value => value !== level))} />{level}</label>)}</div><p className={s.hint}>Shown on the coach card and used by the skill-level filter.</p></fieldset>
    <label className={`${s.field} ${s.full}`}>Bio<textarea value={data.bio} maxLength={4000} onChange={event => change("bio", event.target.value)} /></label>
    </fieldset>{error && <p className={`${s.error} mt-4`} role="alert">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" className={`${s.button} ${s.secondary}`} disabled={busy || uploading} onClick={onClose}>Cancel</button><button type="submit" className={s.button} disabled={busy || uploading}>{uploading ? "Uploading…" : busy ? "Saving…" : "Save Coach"}</button></div></form></div></Modal>;
}

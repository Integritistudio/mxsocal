/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiImage, FiTrash2, FiUpload } from "react-icons/fi";
import s from "./admin-products.module.css";
export default function ImagePicker({ images, onChange, label = "Product photos", max = 20, onBusyChange }: { onBusyChange?: (busy: boolean) => void; images: string[]; onChange: (images: string[]) => void; label?: string; max?: number }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (images.length + files.length > max) { setError(`Choose up to ${max} photos.`); return; }
    setBusy(true); onBusyChange?.(true); setError("");
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData(); form.append("images", file);
        const response = await fetch("/api/product-photo", { method: "POST", body: form });
        const result = await response.json(); if (!response.ok) throw new Error(result.message || "Upload failed.");
        added.push(...result.images);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload photos."); }
    finally { if (added.length) onChange([...images, ...added]); setBusy(false); onBusyChange?.(false); }
  }
  function move(index: number, direction: number) { const result = [...images]; [result[index], result[index + direction]] = [result[index + direction], result[index]]; onChange(result); }
  return <fieldset className={s.mediaPicker} disabled={busy}><legend>{label}</legend><p className={s.hint}>Upload JPG or PNG photos under 5 MB each. The first image is the cover.</p><div className={s.imageGrid}>{images.filter(Boolean).map((image, index) => <div className={s.imageTile} key={`${image}-${index}`}><img src={image} alt={`${label}, photo ${index + 1}`} /><span>{index === 0 ? "Cover" : `Photo ${index + 1}`}</span><div className={s.iconActions}><button type="button" title="Move left" aria-label={`Move photo ${index + 1} left`} disabled={!index} onClick={() => move(index, -1)}><FiArrowLeft /></button><button type="button" title="Move right" aria-label={`Move photo ${index + 1} right`} disabled={index === images.length - 1} onClick={() => move(index, 1)}><FiArrowRight /></button><button type="button" title="Remove photo" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(images.filter((_, i) => i !== index))}><FiTrash2 /></button></div></div>)}{images.length < max && <label className={s.uploadTile}><FiUpload size={24} /><span>{busy ? "Uploading…" : "Add photos"}</span><input className={s.hiddenInput} type="file" multiple accept="image/png,image/jpeg,.jpg,.jpeg,.png" onChange={event => { void upload(event.target.files); event.target.value = ""; }} /></label>}{!images.length && <FiImage className={s.emptyIcon} size={48} />}</div>{error && <p className={s.error} role="alert">{error}</p>}</fieldset>;
}

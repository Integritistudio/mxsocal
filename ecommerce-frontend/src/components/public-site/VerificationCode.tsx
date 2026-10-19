"use client";
import { useRef, useState } from "react";
import s from "./customer-account.module.css";
export default function VerificationCode({ error, onEdit }: { error?: string; onEdit: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  function fill(value: string, start: number) {
    onEdit();
    const clean = value.replace(/\D/g, "").slice(0, 6 - start);
    setDigits(previous => { const next = [...previous]; if (!clean) next[start] = ""; else [...clean].forEach((digit, offset) => { next[start + offset] = digit; }); return next; });
    if (clean) inputs.current[Math.min(start + clean.length, 5)]?.focus();
  }
  return <div className={s.codeField}><span id="code-label">Verification code</span><input type="hidden" name="code" value={digits.join("")} /><div className={s.codeDigits} role="group" aria-labelledby="code-label" aria-describedby={error ? "code-error" : undefined}>{digits.map((digit, index) => <input key={index} ref={node => { inputs.current[index] = node; }} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Digit ${index + 1}`} aria-invalid={Boolean(error)} value={digit} autoFocus={index === 0} onChange={event => fill(event.target.value, index)} onFocus={event => event.target.select()} onPaste={event => { event.preventDefault(); fill(event.clipboardData.getData("text"), index); }} onKeyDown={event => { if (event.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus(); }} />)}</div>{error && <small id="code-error" className={s.error} role="alert">{error}</small>}</div>;
}

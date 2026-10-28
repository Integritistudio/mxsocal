"use client";
import { useRef, useState, type FormEvent } from "react";
import { FiSend } from "react-icons/fi";
import s from "./contact-design.module.css";
export default function FooterContactForm({ founder = false, className }: { founder?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    lock.current = true; setBusy(true); setMessage("");
    try {
      await fetch("/api/footer-contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), website: fields.get("website") }), signal: AbortSignal.timeout(12000) });
    } catch { /* Keep the public acknowledgement identical when the service is unavailable. */ }
    finally {
      form.reset(); setMessage("Thanks for your interest in MXSoCal!"); setBusy(false); lock.current = false;
    }
  }
  return <><form className={className} onSubmit={submit} aria-busy={busy}>
    <input name="email" type="email" aria-label="Your email" placeholder={founder ? "Your Email Address" : "Enter your email here"} autoComplete="email" maxLength={254} required disabled={busy} onChange={() => setMessage("")} />
    <label className={s.footerTrap} aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
    <button type="submit" disabled={busy} aria-label={founder ? busy ? "Sending request" : "Get founder's access" : undefined}>{founder ? <FiSend size={16} aria-hidden="true" /> : busy ? "Sending..." : "Contact us"}</button>
  </form><div className={s.footerFeedback} role="status" aria-live="polite">{message}</div></>;
}

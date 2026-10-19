"use client";

import { useRef, useState, type FormEvent } from "react";
import { contactContent } from "@/data/public-site";
import styles from "./public-site.module.css";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const pending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    if (String(values.name).trim().length < 2 || String(values.message).trim().length < 10) {
      setStatus("error"); setMessage("Please enter your name and a message of at least 10 characters."); return;
    }
    pending.current = true; setStatus("sending"); setMessage("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error(response.status === 400 ? "Please check your details and try again." : "We couldn’t send your message. Please try again shortly.");
      setStatus("success"); setMessage(contactContent.success); form.reset();
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "Please try again shortly.");
    } finally { pending.current = false; }
  }

  return <form onSubmit={submit} className={styles.form} aria-label="Contact us" aria-busy={status === "sending"}>
    <div className={styles.formGrid}>
      <label>Full name <span aria-hidden="true">*</span><input name="name" autoComplete="name" placeholder="Your name" required minLength={2} maxLength={100} /></label>
      <label>Email address <span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>
      <label>Phone number <span className={styles.optional}>(optional)</span><input name="phone" type="tel" autoComplete="tel" placeholder="Your phone number" maxLength={30} pattern="[+0-9() .\-]{7,30}" title="Enter 7–30 characters using numbers, spaces, +, parentheses, periods, or hyphens." /></label>
      <label>What can we help with? <span aria-hidden="true">*</span><select name="topic" required defaultValue=""><option value="" disabled>Select a topic</option>{contactContent.topics.map(topic => <option key={topic}>{topic}</option>)}</select></label>
    </div>
    <label>Your message <span aria-hidden="true">*</span><textarea name="message" placeholder="Tell us a little more…" required minLength={10} maxLength={5000} rows={5} /></label>
    <div className={styles.honeypot} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className={styles.formNote}>By sending this form, you agree that we may use these details to respond to your inquiry.</p>
    <button className={styles.submit} disabled={status === "sending"} type="submit">{status === "sending" ? "Sending…" : "Send message"}<span aria-hidden="true">↗</span></button>
    <p className={status === "error" ? styles.error : styles.success} role={status === "error" ? "alert" : "status"} aria-live="polite">{message}</p>
  </form>;
}

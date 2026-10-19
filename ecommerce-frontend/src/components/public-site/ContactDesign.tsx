/* eslint-disable @next/next/no-img-element */
"use client";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import s from "./contact-design.module.css";
import { contactFields, formatUSPhone, validateContactField, type ContactField } from "./contact-validation";
const asset = (file: string) => `/images/contact/${file}`;
export default function ContactDesign() {
  const [status, setStatus] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const touched = useRef(new Set<ContactField>());
  const pending = useRef(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name")?.trim();
    const coachId = params.get("coach");
    const bikeId = params.get("bike");
    const selectedId = coachId || bikeId;
    const message = pageRef.current?.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (selectedId && /^[0-9a-f-]{36}$/i.test(selectedId) && name && name.length <= 100 && message && !message.value) {
      message.value = coachId ? `I’d like to book a coaching session with ${name}.` : `I’d like to rent the ${name}. Please let me know about availability.`;
    }
  }, []);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(glowRef.current, { x: 12, y: -8, duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }, pageRef);
    return () => media.revert();
  }, []);
  function validateField(field: ContactField, value: string) {
    setErrors(previous => ({ ...previous, [field]: validateContactField(field, value) }));
  }
  function fieldProps(field: ContactField) {
    return {
      id: `contact-${field}`,
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": errors[field] ? `contact-${field}-error` : undefined,
      onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        touched.current.add(field);
        validateField(field, event.currentTarget.value);
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (field === "phone") {
          const input = event.currentTarget as HTMLInputElement;
          const raw = input.value;
          const beforeCursor = raw.slice(0, input.selectionStart ?? raw.length);
          let digitCount = beforeCursor.replace(/\D/g, "").length;
          if (raw.replace(/\D/g, "").startsWith("1")) digitCount = Math.max(0, digitCount - 1);
          input.value = formatUSPhone(raw);
          let cursor = 0;
          for (let count = 0; cursor < input.value.length && count < digitCount; cursor++) {
            if (/\d/.test(input.value[cursor])) count++;
          }
          input.setSelectionRange(cursor, cursor);
        }
        if (touched.current.has(field)) validateField(field, event.currentTarget.value);
      },
    };
  }
  function fieldError(field: ContactField) {
    return errors[field] ? <p id={`contact-${field}-error`} className={s.fieldError} aria-live="polite">{errors[field]}</p> : null;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const nextErrors: Partial<Record<ContactField, string>> = {};
    for (const field of contactFields) {
      touched.current.add(field);
      const error = validateContactField(field, String(data[field] ?? ""));
      if (error) nextErrors[field] = error;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFeedback("");
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    data.email = String(data.email).trim();
    data.message = String(data.message).trim();
    pending.current = true; setStatus("sending"); setFeedback("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${String(data.firstName).trim()} ${String(data.lastName).trim()}`.trim(), email: data.email, phone: data.phone, message: data.message, topic: "General inquiry", website: data.website }) });
      if (!response.ok) throw new Error(response.status === 400 ? "Please check your contact details and try again." : "We couldn’t send your message. Please try again shortly.");
      form.reset(); touched.current.clear(); setErrors({}); setStatus("success"); setFeedback("Thanks for reaching out. Your message has been received.");
    } catch (error) { setStatus("error"); setFeedback(error instanceof Error ? error.message : "Please try again shortly."); }
    finally { pending.current = false; }
  }
  return <div className={s.page} ref={pageRef}>
    <a className={s.skip} href="#main-content">Skip to content</a>
    <PublicSiteHeader activePath="/contact-us" />
    <main id="main-content" className={s.main}>
      <div className={s.glow} ref={glowRef} aria-hidden="true"><div><img src={asset("6e53c.svg")} alt="" width="2301.77" height="3977.04" /></div></div>
      <h1>Contact Us</h1>
      <div className={s.map}>
        <iframe
          className={s.mapEmbed}
          title="Google Maps — The Plaza, New York"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d386800.82728509477!2d-74.58406631093747!3d40.76463180000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c258f07d5da561%3A0x61f6aa300ba8339d!2sThe%20Plaza!5e0!3m2!1sen!2s!4v1792158944279!5m2!1sen!2s"
          width="800"
          height="600"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <motion.div className={s.contact} initial={false} whileInView={reduceMotion ? undefined : { y: [6, 0] }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <section className={s.formSection} aria-labelledby="form-heading"><h2 id="form-heading">Get in Touch with MXSoCal</h2><p className={s.intro}>We are here to help with rentals, training programs, and any questions you have</p>
          <form className={s.form} onSubmit={submit} noValidate aria-busy={status === "sending"}><div className={s.fields}>
            <div className={s.field}><label>First Name<input {...fieldProps("firstName")} name="firstName" autoComplete="given-name" placeholder="Enter your first name" required maxLength={49} /></label>{fieldError("firstName")}</div>
            <div className={s.field}><label>Last Name<input {...fieldProps("lastName")} name="lastName" autoComplete="family-name" placeholder="Enter your last name" required maxLength={49} /></label>{fieldError("lastName")}</div>
            <div className={s.field}><label>Email<input {...fieldProps("email")} name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>{fieldError("email")}</div>
            <div className={s.field}><label>Phone (optional)<input {...fieldProps("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(213) 555-0123" maxLength={30} /></label>{fieldError("phone")}</div>
          </div><div className={s.field}><label className={s.comment}>Comment<textarea {...fieldProps("message")} name="message" placeholder="How can we help you?" required minLength={10} maxLength={5000} /></label>{fieldError("message")}</div>
          <div className={s.honeypot} aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" aria-label="Website" /></div>
          <motion.button disabled={status === "sending"} type="submit" initial="rest" whileHover="hover" whileFocus="hover" whileTap={reduceMotion ? undefined : { scale: 0.985 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>{status === "sending" ? "Sending…" : "Send Message"}<motion.span className={s.sendIcon} aria-hidden="true" variants={{ rest: { x: 0, y: 0 }, hover: { x: reduceMotion ? 0 : 3, y: reduceMotion ? 0 : -3 } }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}><img src={asset("16497.svg")} alt="" /></motion.span></motion.button>
          {feedback && <p className={s.feedback} role={status === "error" ? "alert" : "status"}>{feedback}</p>}</form>
        </section>
        <aside className={s.details}><h2>Contact details</h2><p>Etiam pharetra egestas interdum blandit viverra morbi consequat mi non bibendum egestas quam egestas nulla.</p>
          <dl><div><dt><img src={asset("5ad4f.svg")} alt="" />Address</dt><dd>329 Queensberry Street, North<br />Melbourne VIC3051, Australia.</dd></div><div><dt><img src={asset("40f30.svg")} alt="" />Email</dt><dd><a href="mailto:ali@boxcars.com">ali@boxcars.com</a></dd></div><div><dt><img src={asset("339e0.svg")} alt="" />Phone</dt><dd><a href="tel:+76956039967">+76 956 039 967</a></dd></div></dl>
          <h3>Follow us</h3><div className={s.social}><a href="https://facebook.com/" aria-label="Facebook"><FaFacebookF /></a><a href="https://twitter.com/" aria-label="Twitter"><FaTwitter /></a><a href="https://instagram.com/" aria-label="Instagram"><FaInstagram /></a><a href="https://linkedin.com/" aria-label="LinkedIn"><FaLinkedinIn /></a></div>
        </aside>
      </motion.div>
    </main>
    <PublicSiteFooter />
  </div>;
}


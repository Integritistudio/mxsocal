"use client";
import VerificationCode from "./VerificationCode";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FiArrowUpRight, FiEye, FiEyeOff } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import { customerRequest } from "@/services/customer";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./customer-account.module.css";
export default function CustomerAuth({ mode, nextPath = "/account", resetToken = "" }: { mode: "signin" | "signup" | "forgot" | "reset"; nextPath?: string; resetToken?: string }) {
  const router = useRouter(); const { login, user, loadingAuth } = useUser();
  const [challenge, setChallenge] = useState(""); const [email, setEmail] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [show, setShow] = useState(false); const [resendAt, setResendAt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fieldError = (name: string) => fieldErrors[name] ? <small id={`${name}-error`} className={s.fieldError} role="alert">{fieldErrors[name]}</small> : null;
  const hasVideo = mode === "signin" || mode === "signup";
  const sessionPending = Boolean(loadingAuth || (user && (mode === "signin" || mode === "signup")));
  useEffect(() => {
    if (loadingAuth || !user || (mode !== "signin" && mode !== "signup")) return;
    const safeNext = /^\/(?:account|bikes|products|booking|ride\/complete)(?:\/|\?|$)/.test(nextPath) && !nextPath.includes("\\") ? nextPath : "/account";
    router.replace(user.role === "user" ? safeNext : "/dashboard");
  }, [loadingAuth, user, mode, nextPath, router]);
  const title = challenge ? "Verify your email" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Forgot your password?" : mode === "reset" ? "Choose your password" : "Welcome back";
  function finish(user: Parameters<typeof login>[0]) { login(user); const next = nextPath; const staffHome = user.role === "manager" ? Object.entries({ "dashboard:view": "/dashboard", "product:view": "/products", "coach:view": "/dashboard/coaches", "booking:view": "/bookings" }).find(([permission]) => user.permissions?.includes(permission))?.[1] || "/profile" : "/dashboard"; router.replace(user.role !== "user" ? staffHome : /^\/(?:account|bikes|products|booking|ride\/complete)(?:\/|\?|$)/.test(next) && !next.includes("\\") ? next : "/account");  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); setError(""); setMessage("");
    const errors: Record<string, string> = {};
    const value = (key: string) => String(data[key] || "");
    if (challenge) {
      if (!/^[0-9]{6}$/.test(value("code"))) errors.code = "Enter the six-digit verification code.";
    } else {
      if (mode === "signup") {
        for (const [key, label] of [["firstName", "First name"], ["lastName", "Last name"]]) {
          if (!value(key).trim()) errors[key] = `${label} is required.`;
          else if (value(key).trim().length > 100) errors[key] = `${label} must be 100 characters or fewer.`;
        }
        if (value("phone") && !/^\+?[\d\s().-]{7,25}$/.test(value("phone"))) errors.phone = "Enter a valid phone number, or leave it blank.";
      }
      if (mode !== "reset") {
        if (!value("email").trim()) errors.email = "Email address is required.";
        else if (value("email").trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email").trim())) errors.email = "Enter a valid email address.";
      }
      if (mode !== "forgot") {
        if (!value("password")) errors.password = "Password is required.";
        else if (mode !== "signin" && (value("password").length < 7 || value("password").length > 17)) errors.password = "Password must be between 7 and 17 characters.";
      }
      if (mode === "reset" && value("password") !== value("confirmPassword")) errors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const input = event.currentTarget.elements.namedItem(Object.keys(errors)[0]);
      if (input instanceof HTMLInputElement && input.type === "hidden") event.currentTarget.querySelector<HTMLInputElement>('[aria-label="Digit 1"]')?.focus();
      else if (input instanceof HTMLElement) input.focus();
      return;
    }
    setBusy(true);
    try {
      if (challenge) { const result = await customerRequest("verify-email", "POST", { challengeId: challenge, code: data.code }); finish(result.user); }
      else if (mode === "signup") { const result = await customerRequest("signup", "POST", data); setEmail(String(data.email)); setChallenge(result.challengeId); setResendAt(Date.now() + 60000); setMessage(result.message); }
      else if (mode === "signin") { const result = await customerRequest("login", "POST", data); finish(result.user); }
      else if (mode === "forgot") { const result = await customerRequest("forgot-password", "POST", data); setMessage(result.message); }
      else { const result = await customerRequest("reset-password", "POST", { password: data.password, token: resetToken || new URLSearchParams(window.location.hash.slice(1)).get("token") || "" }); if (result.user) finish(result.user); else setMessage(result.message); }
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); } finally { setBusy(false); }
  }
  async function resend() { if (Date.now() < resendAt) { setError("Please wait a minute before requesting another code."); return; } setBusy(true); setError(""); try { const result = await customerRequest("resend-otp", "POST", { challengeId: challenge }); setMessage(result.message); setResendAt(Date.now() + 60000); } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); } finally { setBusy(false); } }
  return <div className={shared.page}><PublicSiteHeader activePath="" compact /><main className={`${s.authMain} ${hasVideo ? s.authWithVideo : ""}`}>
    {hasVideo && <><video className={s.authVideo} autoPlay muted loop playsInline controls={false} disablePictureInPicture preload="metadata" poster="/images/contact/b541a.png" aria-hidden="true" tabIndex={-1} onVolumeChange={event => { event.currentTarget.muted = true; }}><source src="/videos/login-signup-videos.mov" /></video><div className={s.authOverlay} aria-hidden="true" /></>}
    <section className={s.authCard}>{sessionPending ? <div className={s.sessionLoading} role="status" aria-label="Loading your account"><span className={s.loadingSpinner} aria-hidden="true" /><p>Loading your account</p><div className={s.sessionSkeleton} aria-hidden="true"><span /><span /><span /></div></div> : <><h1>{title}</h1><p className={s.intro}>{challenge ? `Enter the six-digit code sent to ${email}. It expires in 10 minutes.` : mode === "signup" ? "Save your favorite rides, manage your profile, and share your experience." : mode === "forgot" ? "We’ll email you a secure link to choose a new password." : mode === "reset" ? "Choose a strong password that you haven’t used elsewhere." : "Sign in to your MXSoCal account."}</p>
    <form noValidate onBlur={event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      let message = "";
      if (input.name === "password") {
        if (!input.value) message = "Password is required.";
        else if (mode !== "signin" && (input.value.length < 7 || input.value.length > 17)) message = "Password must be between 7 and 17 characters.";
      } else if (input.name === "confirmPassword") {
        const password = input.form?.elements.namedItem("password");
        if (password instanceof HTMLInputElement && input.value !== password.value) message = "Passwords do not match.";
      } else return;
      setFieldErrors(previous => { const next = { ...previous }; if (message) next[input.name] = message; else delete next[input.name]; return next; });
    }} onSubmit={submit} onInput={event => { const target = event.target; if (target instanceof HTMLInputElement) { setFieldErrors(previous => { const next = { ...previous }; delete next[target.name]; return next; }); setError(""); } }} className={`${s.form} ${s.authForm}`}>
      {challenge ? <VerificationCode error={fieldErrors.code} onEdit={() => { setFieldErrors(previous => { const next = { ...previous }; delete next.code; return next; }); setError(""); }} /> : <>
        {mode === "signup" && <div className={s.twoColumns}><label>First name<input name="firstName" aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined} autoComplete="given-name" required maxLength={100} />{fieldError("firstName")}</label><label>Last name<input name="lastName" aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined} autoComplete="family-name" required maxLength={100} />{fieldError("lastName")}</label></div>}
        {mode !== "reset" && <label>Email address<input name="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} type="email" autoComplete="email" required maxLength={254} />{fieldError("email")}</label>}
        {mode === "signup" && <label><span>Phone <small>(optional)</small></span><input name="phone" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} type="tel" autoComplete="tel" placeholder="(555) 123-4567" maxLength={25} />{fieldError("phone")}</label>}
        {mode !== "forgot" && <><label>Password<div className={s.password}><input name="password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined} type={show ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "signin" ? 1 : 7} maxLength={mode === "signin" ? undefined : 17} /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? <FiEyeOff /> : <FiEye />}</button></div>{fieldError("password")}</label></>}
        {mode === "reset" && <label>Confirm password<input name="confirmPassword" aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined} type={show ? "text" : "password"} autoComplete="new-password" required minLength={7} maxLength={17} />{fieldError("confirmPassword")}</label>}
      </>}
      {error && <p className={s.error} role="alert">{error}</p>}{message && (mode === "forgot" ? <div className={s.resetConfirmation} role="status"><h2>Check your inbox</h2><p>{message}</p><small>Check your spam folder too. For security, the link can only be used once.</small></div> : <p className={s.success} role="status">{message}</p>)}
      <button className={s.primary} disabled={busy} aria-busy={busy}>{busy ? "Please wait…" : challenge ? "Verify & Sign In" : mode === "signup" ? "Send verification code" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Set Password" : "Sign In"}{busy ? <span className={s.loadingSpinner} aria-hidden="true" /> : <FiArrowUpRight />}</button>
    </form>
    <div className={s.authLinks}>{challenge ? <><button onClick={resend} disabled={busy}>Resend code</button><button onClick={() => { setChallenge(""); setError(""); setMessage(""); }}>Use another email</button></> : <>{mode === "signin" && <Link href="/forgot-password">Forgot password?</Link>}<p>{mode === "signup" ? "Already have an account?" : "New to MXSoCal?"} <Link href={mode === "signup" ? "/sign-in" : "/sign-up"}>{mode === "signup" ? "Sign in" : "Create an account"}</Link></p>{["forgot", "reset"].includes(mode) && <Link href="/sign-in">Back to Sign In</Link>}</>}</div>
  </>}</section></main><PublicSiteFooter /></div>;
}

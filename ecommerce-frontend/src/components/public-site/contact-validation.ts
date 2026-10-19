export type ContactField = "firstName" | "lastName" | "email" | "phone" | "message";
export const contactFields: ContactField[] = ["firstName", "lastName", "email", "phone", "message"];

export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("1") ? digits.slice(1) : digits;
}

export function formatUSPhone(value: string) {
  const digits = phoneDigits(value).slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function validateContactField(field: ContactField, value: string): string {
  const trimmed = value.trim();
  if (field === "firstName" || field === "lastName") {
    const label = field === "firstName" ? "first" : "last";
    if (!trimmed) return `Please enter your ${label} name.`;
    if (!/\p{L}/u.test(trimmed)) return `Your ${label} name must include a letter.`;
    if (trimmed.length > 49) return `Keep your ${label} name under 50 characters.`;
  }
  if (field === "email") {
    if (!trimmed) return "Please enter your email address.";
    if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address, such as you@example.com.";
  }
  if (field === "phone" && trimmed && !/^[2-9]\d{2}[2-9]\d{6}$/.test(phoneDigits(trimmed))) {
    return "Enter a valid 10-digit US phone number, such as (213) 555-0123.";
  }
  if (field === "message") {
    if (!trimmed) return "Please enter a message so we know how to help.";
    if (trimmed.length < 10) return "Please write at least 10 characters.";
    if (trimmed.length > 5000) return "Please keep your message to 5,000 characters or fewer.";
  }
  return "";
}

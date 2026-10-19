export type MenuLink = { label: string; href: string };

// Shared defaults. Pass overrides to PublicShell to customize an individual page.
export const publicSite = {
  name: "MXSoCal",
  tagline: "Your next ride starts here.",
  menu: [{ label: "Contact us", href: "/contact-us" }] satisfies MenuLink[],
  footerText: "Motocross. Community. Southern California.",
};

export const contactContent = {
  eyebrow: "LET’S TALK",
  title: "CONTACT US",
  intro: "Have a question? We’re here to help you get ready for your next ride.",
  formTitle: "Send us a message",
  formDescription: "Tell us what you have in mind and our team will get back to you.",
  topics: ["General inquiry", "Bookings", "Bikes & equipment", "Coaching", "Other"],
  asideTitle: "LET’S GET YOU RIDING.",
  asideText: "From your first lap to your next adventure, reach out with questions about bookings, equipment, or coaching.",
  success: "Thanks for reaching out. Your message has been received.",
};

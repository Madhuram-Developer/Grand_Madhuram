// Default legal text, used until an admin writes their own in Settings → Legal pages.
// Describes what this site actually does (see AGENTS.md before changing tracking/cookies). Not legal advice:
// have it reviewed before launch. {email} / {phone} are replaced with the contact details from Settings.

export const DEFAULT_PRIVACY = `Madhuram ("we", "us") respects your privacy. This policy explains what information this website collects and how we use it.

What we collect
• Enquiry form: when you send an enquiry we store the details you type — your name, phone number, and optionally your email, the project you are interested in and your message — together with the date and the page you sent it from.
• WhatsApp and phone: if you contact us on WhatsApp or by phone, that conversation happens on those services under their own privacy policies.
• Page view counts: we count how many times each project page is viewed. These counts are anonymous totals per day; we do not store your IP address, use cookies for this, or build a profile of you.

How we use it
We use your enquiry details only to reply to you about our projects. We do not sell or rent your information, and we do not share it with anyone outside our team except the service providers that host this website and its data.

Service providers
This website is hosted on secure cloud infrastructure. Images and brochures are served by Cloudinary. Maps are shown using Google Maps and videos using YouTube; these load only on the pages where they appear and are governed by Google's privacy policy.

How long we keep it
We keep enquiries for as long as needed to respond and follow up, and delete them on request.

Your choices
You can ask us to see, correct or delete the information you sent us. Write to {email} or call {phone}.

Changes
We may update this policy from time to time; any changes will appear on this page.`;

export const DEFAULT_COOKIES = `This page explains how this website uses cookies and similar technologies.

Cookies we set
• We do not use advertising or tracking cookies on the public website, so we do not show a cookie consent banner.
• Staff who sign in to the admin area receive one essential "session" cookie that keeps them signed in. It is not set for regular visitors.

Browser storage
To avoid counting the same visit twice, your browser remembers which project pages it has already counted during the current tab session (session storage). It holds no personal information and is cleared when you close the tab.

Third-party content
• Google Maps: project and contact pages show an embedded Google map, which may set Google cookies when it loads.
• YouTube: videos use YouTube's privacy-enhanced mode and only load after you press play.
• WhatsApp: "Chat on WhatsApp" and "Know price" buttons open WhatsApp, which has its own policies.

Managing cookies
You can block or delete cookies in your browser settings. The website will keep working; embedded maps may not display.

Questions
Write to {email} or call {phone}.`;

/** Fill {email}/{phone}; drop a line that ends up empty-handed rather than show a raw placeholder. */
export function fillLegal(text: string, contact: { email?: string | null; phone?: string | null }) {
  const email = contact.email || "us via the contact details on this website";
  return text.replaceAll("{email}", email).replaceAll(" or call {phone}", contact.phone ? ` or call ${contact.phone}` : "").replaceAll("{phone}", contact.phone ?? "");
}

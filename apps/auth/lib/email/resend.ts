import { render } from "@react-email/render";
import { Resend } from "resend";

import { MagicLinkEmail } from "@/emails/magic-link";

type SendMagicLinkArgs = {
  to: string;
  url: string;
  firstName: string | null;
};

/**
 * Sends the magic-link confirmation email. In dev (no RESEND_API_KEY),
 * logs the URL to the server console instead — keeps the free tier untouched.
 */
export async function sendMagicLink({
  to,
  url,
  firstName,
}: SendMagicLinkArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[magic-link] (no RESEND_API_KEY) for ${to}: ${url}`);
    return;
  }
  const from = process.env.EMAIL_FROM ?? "no-reply@auth.sdfwa.org";
  const resend = new Resend(apiKey);
  const html = await render(MagicLinkEmail({ url, firstName }));
  const result = await resend.emails.send({
    from,
    to,
    subject: "Confirm this device to sign in to SDFWA",
    html,
  });
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
}

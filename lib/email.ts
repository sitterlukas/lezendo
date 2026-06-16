import { Resend } from "resend";
import { siteUrl } from "@/lib/site";

// Resend's shared sandbox sender works out of the box for testing; set
// EMAIL_FROM to a verified domain in production.
const from = process.env.EMAIL_FROM ?? "Whipperbook <onboarding@resend.dev>";

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const link = `${siteUrl()}/verify?token=${token}`;
  const apiKey = process.env.RESEND_API_KEY;

  // Without a key (local dev), log the link instead of failing the signup so
  // the flow stays testable.
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — verification link: ${link}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: email,
    subject: "Verify your email for Whipperbook",
    text: `Welcome to Whipperbook!\n\nConfirm your email address to finish setting up your account:\n\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
  });
}

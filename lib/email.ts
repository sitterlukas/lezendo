import { Resend } from "resend";
import { siteUrl } from "@/lib/site";

// Resend's shared sandbox sender works out of the box for testing; set
// EMAIL_FROM to a verified domain in production.
const from = process.env.EMAIL_FROM ?? "Whipperbook <onboarding@resend.dev>";

// Inline styles + a table shell keep this rendering consistently across email
// clients (which strip <style> blocks and ignore flexbox).
function verificationEmailHtml(link: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:40px 40px 0;">
                <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#18181b;">Whipperbook</div>
                <h1 style="margin:24px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b;">Confirm your email</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#52525b;">
                  Welcome aboard! Confirm your email address to finish setting up your Whipperbook account and start logging your ascents.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#18181b;">
                      <a href="${link}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Verify email</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
                  Or paste this link into your browser:<br />
                  <a href="${link}" target="_blank" style="color:#3f3f46;word-break:break-all;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 40px;">
                <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">
                  This link expires in 24 hours. If you didn't create a Whipperbook account, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            © ${new Date().getFullYear()} Whipperbook
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

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
    html: verificationEmailHtml(link),
    // Plain-text fallback for clients that don't render HTML.
    text: `Welcome to Whipperbook!\n\nConfirm your email address to finish setting up your account:\n\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
  });
}

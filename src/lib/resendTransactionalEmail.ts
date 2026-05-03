/** Shared Resend sender for transactional messages (verification, password reset, etc.). */

function trimEnvValue(raw: string | undefined): string {
  const s = raw?.trim() ?? "";
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).trim();
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).trim();
  }
  return s;
}

export type ResendSendResult =
  | { ok: true }
  | { ok: false; reason: "MISSING_EMAIL_CONFIG" }
  | { ok: false; reason: "RESEND_REJECTED"; status: number; detail: string };

/**
 * Sends via Resend when RESEND_API_KEY and EMAIL_FROM are set.
 * Returns ok:false with MISSING_EMAIL_CONFIG when env is incomplete (does not throw).
 */
export async function sendResendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<ResendSendResult> {
  const resendApiKey = trimEnvValue(process.env.RESEND_API_KEY);
  const emailFrom = trimEnvValue(process.env.EMAIL_FROM);

  if (!resendApiKey || !emailFrom) {
    const hint =
      "Set RESEND_API_KEY and EMAIL_FROM in the server environment to send email (see Resend dashboard).";
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email] ${hint}`);
      console.info(`[email:dev] to=${params.to} subject=${params.subject}\n${params.text}`);
    } else {
      console.error(`[email] ${hint}`);
    }
    return { ok: false, reason: "MISSING_EMAIL_CONFIG" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
  });

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) {
    console.error(
      `[email] Resend API rejected request (HTTP ${res.status}). This often does NOT create a row under Emails in the Resend UI — use this log instead:\n${bodyText}`
    );
    return { ok: false, reason: "RESEND_REJECTED", status: res.status, detail: bodyText.slice(0, 500) };
  }

  let resendId = "";
  try {
    const j = JSON.parse(bodyText) as { id?: string };
    if (typeof j.id === "string") resendId = j.id;
  } catch {
    /* ignore */
  }
  console.info(`[email] Resend accepted email (HTTP ${res.status}) id=${resendId || "unknown"}`);
  return { ok: true };
}

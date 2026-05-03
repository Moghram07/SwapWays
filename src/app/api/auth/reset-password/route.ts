import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/csrf";
import { resetPasswordWithToken } from "@/lib/passwordReset";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const token = typeof (body as { token?: unknown }).token === "string" ? (body as { token: string }).token : "";
  const password =
    typeof (body as { password?: unknown }).password === "string" ? (body as { password: string }).password : "";

  if (!token.trim() || !password) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Please enter your new password and use the link from your email." },
      { status: 422 }
    );
  }

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    if (result.reason === "SHORT") {
      return NextResponse.json(
        { data: null, error: "Validation failed", message: "Password must be at least 8 characters long." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      {
        data: null,
        error: "InvalidToken",
        message: "This reset link is invalid or has expired. Please request a new link from the sign-in page.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: { ok: true },
    error: null,
    message: "Your password has been updated. You can now sign in with your new password.",
  });
}

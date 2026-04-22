"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function VerifyEmailForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Phase 1 uses schedule upload for verification. Sign in and upload your first schedule to verify your account.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/schedule">Upload schedule</Link>
        </Button>
      </div>
    </div>
  );
}

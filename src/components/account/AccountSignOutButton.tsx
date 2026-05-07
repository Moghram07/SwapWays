"use client";

import { signOut } from "next-auth/react";

export function AccountSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
    >
      Sign out
    </button>
  );
}

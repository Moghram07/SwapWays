import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-slate-200 shadow-md">
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
          <p className="text-sm text-slate-600">Use your airline email and password.</p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/register" className="font-medium text-[#045FA6] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg border-slate-200 shadow-md">
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create account</h1>
          <p className="text-sm text-slate-600">Register with your airline email and crew details.</p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#045FA6] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

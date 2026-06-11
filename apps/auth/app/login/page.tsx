import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth/get-session";
import { safeRedirect } from "@/lib/safe-redirect";
import { LoginForm } from "@/components/login-form";

type SearchParams = Promise<{ redirect?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = safeRedirect(redirectParam);
  const session = await getServerSession();
  if (session?.user) redirect(redirectTo);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}

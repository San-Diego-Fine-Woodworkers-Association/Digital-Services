export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/fair-registration/login?redirect=/fair-registration/admin");
	}

	// Check admin role
	const roles = (session as Record<string, unknown>)?.roles as string[] | undefined;
	if (!roles?.includes("admin")) {
		redirect("/fair-registration");
	}

	return <>{children}</>;
}

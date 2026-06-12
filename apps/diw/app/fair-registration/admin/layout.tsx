import { redirect } from "next/navigation";
import { getSession, isAdmin, loginUrl } from "@/lib/auth/session";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getSession();

	if (!session) {
		redirect(loginUrl("/fair-registration/admin"));
	}

	if (!isAdmin(session)) {
		redirect("/fair-registration");
	}

	return <>{children}</>;
}

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";

export default async function ProfilePage() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/fair-registration/login?redirect=/fair-registration/profile");
	}

	const user = session.user;
	const roles = (session as Record<string, unknown>)?.roles as string[] | undefined;
	const isAdmin = roles?.includes("admin");

	return (
		<div className="p-4 mx-auto w-full max-w-[1200px]">
			<h1 className="text-2xl font-bold mb-6">Profile</h1>

			{isAdmin && (
				<span className="inline-block mb-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
					Admin
				</span>
			)}

			<dl className="space-y-4">
				<div>
					<dt className="text-sm text-muted-foreground">Name</dt>
					<dd className="font-medium">{user.name}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted-foreground">Email</dt>
					<dd className="font-medium">{user.email}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted-foreground">Member ID</dt>
					<dd className="font-medium">{user.id}</dd>
				</div>
			</dl>
		</div>
	);
}

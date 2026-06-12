import { redirect } from "next/navigation";
import { getSession, getUser, isAdmin as sessionIsAdmin, loginUrl } from "@/lib/auth/session";

export default async function ProfilePage() {
	const session = await getSession();

	if (!session) {
		redirect(loginUrl("/fair-registration/profile"));
	}

	const currentUser = await getUser();
	const isAdmin = sessionIsAdmin(session);
	const member =
		currentUser && "member" in currentUser ? currentUser.member : null;

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
					<dd className="font-medium">{currentUser?.name ?? session.user.email}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted-foreground">Email</dt>
					<dd className="font-medium">{session.user.email}</dd>
				</div>
				{session.user.memberId && (
					<div>
						<dt className="text-sm text-muted-foreground">Member ID</dt>
						<dd className="font-medium">{session.user.memberId}</dd>
					</div>
				)}
				{member?.membership && (
					<div>
						<dt className="text-sm text-muted-foreground">Membership</dt>
						<dd className="font-medium">{member.membership}</dd>
					</div>
				)}
				{member?.address && (
					<div>
						<dt className="text-sm text-muted-foreground">Address</dt>
						<dd className="font-medium whitespace-pre-line">{member.address}</dd>
					</div>
				)}
				{member?.phone && (
					<div>
						<dt className="text-sm text-muted-foreground">Phone</dt>
						<dd className="font-medium">{member.phone}</dd>
					</div>
				)}
			</dl>
			<p className="text-sm text-muted-foreground mt-6">
				This information is synced from ProClass. To make changes, update your member record in ProClass.
			</p>
		</div>
	);
}

import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getServerSession } from "@/lib/auth/get-session";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ redirect?: string }>;
}) {
	const session = await getServerSession();

	const user = session?.user;

	// If the user is already signed in, redirect to the intended page
	if (user) {
		const { redirect: redirectTo } = await searchParams;
		redirect(redirectTo || "/fair-registration");
	}

	return (
		<div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center p-4">
			<div className="w-full max-w-md">
				<LoginForm />
			</div>
		</div>
	);
}

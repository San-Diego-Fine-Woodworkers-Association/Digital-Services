import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import { getMyRegistrations } from "@/lib/actions/registration";
import { MyRegistrationsClient } from "./my-registrations-client";

export default async function Page() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/fair-registration/login?redirect=/fair-registration/my-registrations");
	}

	const registrations = await getMyRegistrations();

	return <MyRegistrationsClient registrations={registrations} />;
}

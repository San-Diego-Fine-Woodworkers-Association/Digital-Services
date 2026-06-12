import { redirect } from "next/navigation";
import { getSession, loginUrl } from "@/lib/auth/session";
import { getMyRegistrations } from "@/lib/actions/registration";
import { MyRegistrationsClient } from "./my-registrations-client";

export default async function Page() {
	const session = await getSession();

	if (!session) {
		redirect(loginUrl("/fair-registration/my-registrations"));
	}

	const registrations = await getMyRegistrations();

	return <MyRegistrationsClient registrations={registrations} />;
}

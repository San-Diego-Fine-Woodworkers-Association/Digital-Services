import { AdminLayoutClient } from "../admin-layout-client";

export default function RegistrationsLayout({ children }: { children: React.ReactNode }) {
	return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

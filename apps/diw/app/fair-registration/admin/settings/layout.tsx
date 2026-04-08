import { AdminLayoutClient } from "../admin-layout-client";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
	return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

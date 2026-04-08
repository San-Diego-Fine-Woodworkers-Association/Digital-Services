import { AdminLayoutClient } from "../admin-layout-client";

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
	return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

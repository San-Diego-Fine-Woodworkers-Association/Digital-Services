import { AdminLayoutClient } from "../admin-layout-client";

export default function FairLayout({ children }: { children: React.ReactNode }) {
	return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

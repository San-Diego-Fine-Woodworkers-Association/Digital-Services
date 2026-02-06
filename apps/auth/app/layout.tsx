import type { Metadata } from "next";
import "@repo/ui/styles.css";
import "./global.css";

export const metadata: Metadata = {
	title: "SDFWA Auth",
	description: "San Diego Furniture Workers Alliance - Authentication",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}

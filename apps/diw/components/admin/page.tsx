import { SidebarTrigger } from "@sdfwa/ui/components/sidebar";

export function AdminPage({ title, children }: Readonly<{
	title: string;
	children: React.ReactNode;
}>) {
	return (
		<div className="h-full flex flex-col">
			<header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
				<SidebarTrigger className="-ml-1" />
				<h1 className="text-lg font-semibold">{title}</h1>
			</header>
			<div className="flex flex-1 flex-col w-full gap-4 p-4">
				{ children }
			</div>
		</div>
	)
}
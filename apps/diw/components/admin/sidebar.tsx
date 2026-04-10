import * as React from "react";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@sdfwa/ui/components/sidebar";

type NavItem = {
	label: string;
	icon: React.ComponentType;
	href: string;
}

export function SideBar({ nav, footerNav, ...props }: React.ComponentProps<typeof Sidebar> & {
	nav: NavItem[]; footerNav: NavItem[]
}) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border border-b h-14 px-4 flex-col justify-center">
				<h1 className="text-lg font-semibold">Admin Dashboard</h1>
      </SidebarHeader>
      <SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{nav.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild className="mb-2">
										<Link href={item.href}>
											{item.icon && <item.icon />}
											{item.label}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-auto">
					<SidebarGroupContent>
						<SidebarMenu>
							{footerNav.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild>
										<Link href={item.href}>
											{item.icon && <item.icon />}
											{item.label}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
      </SidebarContent>
			
      <SidebarRail />
    </Sidebar>
  );
}

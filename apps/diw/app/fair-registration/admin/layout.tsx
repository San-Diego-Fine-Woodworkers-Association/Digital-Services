import { SideBar } from "@/components/admin/sidebar"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@sdfwa/ui/components/sidebar"

import { CalendarCog, ClipboardCheck, Settings } from "lucide-react";

const nav = [{
  label: "Shifts and Slots",
  icon: CalendarCog,
  href: "/fair-registration/admin/shifts-and-slots",
}, {
  label: "Registrations",
  icon: ClipboardCheck,
  href: "/fair-registration/admin/registrations",
}];

const footerNav = [{
  label: "Settings",
  icon: Settings,
  href: "/fair-registration/admin/settings",
}];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full h-full">
      <SidebarProvider className="min-h-full h-full">
        <SideBar nav={nav} footerNav={footerNav} variant="floating" collapsible="icon" className="min-h-full h-full sticky" />
        <SidebarInset className="min-h-full h-full">
          { children }
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

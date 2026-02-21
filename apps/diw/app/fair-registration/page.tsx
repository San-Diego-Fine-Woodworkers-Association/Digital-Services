import { SideBar } from "@/components/fair-registration-sidebar"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@sdfwa/ui/components/sidebar"

export default function Page() {
  return (
    <SidebarProvider>
      <SideBar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="bg-muted/50 aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

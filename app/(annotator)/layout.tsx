export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";
import { signOutAction } from "@/lib/admin-actions";
import { requireSession } from "@/lib/session";
import { AnnotatorNav } from "@/components/annotator/annotator-nav";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AnnotatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.user.role === "ADMIN") redirect("/admin");

  return (
    <SidebarProvider>
      <Sidebar className="admin-pos border-r border-[#E6EAED] bg-white">
        <SidebarHeader className="border-b border-[#E6EAED] px-4 py-4">
          <div className="text-[18px] font-bold text-[#092C4C]">Image Labeling</div>
          <div className="text-xs text-[#646B72]">{session.user.email}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold uppercase tracking-normal text-[#7A8086]">Annotator</SidebarGroupLabel>
            <SidebarGroupContent>
              <AnnotatorNav />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <form action={signOutAction}><Button className="pos-button-secondary w-full" type="submit">Sign out</Button></form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="admin-pos min-h-screen bg-[#F9FAFB]">
        <header className="flex h-[60px] items-center gap-3 border-b border-[#E6EAED] bg-white px-6">
          <SidebarTrigger className="pos-icon-button" />
          <ListChecks className="size-5 text-[#198754]" />
          <span className="text-sm font-semibold text-[#212B36]">Annotator labeling workspace</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

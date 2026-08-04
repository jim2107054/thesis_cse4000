export const dynamic = "force-dynamic";

import Link from "next/link";
import { BarChart3, Download, Images, ListChecks, Settings, Tags, Users, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { signOutAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const nav = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/images", label: "Images", icon: Images },
  { href: "/admin/classes", label: "Classes", icon: Tags },
  { href: "/admin/annotators", label: "Annotators", icon: Users },
  { href: "/admin/tie-review", label: "Tie Review", icon: AlertTriangle },
  { href: "/admin/export", label: "Export", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-3">
          <div className="font-semibold">Image Labeling</div>
          <div className="text-xs text-sidebar-foreground/70">{session.user.email}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => <SidebarMenuItem key={item.href}><SidebarMenuButton asChild><Link href={item.href}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <form action={signOutAction}><Button variant="outline" className="w-full" type="submit">Sign out</Button></form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4"><SidebarTrigger /><ListChecks className="size-5" /><span className="font-medium">Audit-ready labeling workspace</span></header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

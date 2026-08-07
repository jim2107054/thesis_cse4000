"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BarChart3, ClipboardList, Download, Images, Settings, Tags, Users, type LucideIcon } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const nav: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/images", label: "Images", icon: Images },
  { href: "/admin/classes", label: "Classes", icon: Tags },
  { href: "/admin/annotators", label: "Annotators", icon: Users },
  { href: "/admin/tie-review", label: "Tie Review", icon: AlertTriangle },
  { href: "/admin/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/export", label: "Export", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {nav.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className="border-l-[3px] border-transparent text-[#646B72] hover:border-[#FE9F43] hover:bg-[#FE9F43]/10 hover:text-[#FE9F43] data-[active=true]:border-[#FE9F43] data-[active=true]:bg-[#FE9F43]/10 data-[active=true]:font-bold data-[active=true]:text-[#FE9F43]"
            >
              <Link href={item.href}><item.icon /><span>{item.label}</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

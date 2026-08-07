"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Images, type LucideIcon } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const nav: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/label", label: "Label Images", icon: Images },
];

export function AnnotatorNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {nav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className="border-l-[3px] border-transparent text-[#646B72] hover:border-[#198754] hover:bg-[#198754]/10 hover:text-[#198754] data-[active=true]:border-[#198754] data-[active=true]:bg-[#198754]/10 data-[active=true]:font-bold data-[active=true]:text-[#198754]"
            >
              <Link href={item.href}><item.icon /><span>{item.label}</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

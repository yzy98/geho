import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@geho/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { FileRouteTypes } from "@/routeTree.gen";

type RoutePath = FileRouteTypes["to"];

export type Item = {
  icon: LucideIcon;
  title: string;
  path: RoutePath;
};

type MainProps = {
  items: Item[];
};

export const Main = ({ items }: MainProps) => {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={location.pathname === item.path}
                render={<Link onClick={handleMenuClick} to={item.path} />}
                tooltip={item.title}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

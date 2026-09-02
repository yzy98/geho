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
  disabled?: boolean;
  icon: LucideIcon;
  path?: RoutePath;
  title: string;
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
                disabled={item.disabled}
                isActive={item.path ? location.pathname === item.path : false}
                render={
                  item.path ? (
                    <Link onClick={handleMenuClick} to={item.path} />
                  ) : undefined
                }
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

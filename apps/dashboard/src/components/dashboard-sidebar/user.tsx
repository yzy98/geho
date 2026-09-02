import type { AuthClient } from "@geho/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@geho/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geho/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@geho/ui/components/sidebar";
import { Spinner } from "@geho/ui/components/spinner";
import {
  EllipsisVerticalIcon,
  LogOutIcon,
  UserCircle2Icon,
} from "lucide-react";
import { useSignOut } from "@/hooks/use-sign-out";

interface UserProps {
  user: NonNullable<ReturnType<AuthClient["useSession"]>["data"]>["user"];
}

export const User = ({ user }: UserProps) => {
  const { isMobile } = useSidebar();
  const { isSigningOut, signOut } = useSignOut();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage alt={user.name} src={user.image ?? undefined} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal text-foreground">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      alt={user.name}
                      src={user.image ?? undefined}
                    />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserCircle2Icon />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={isSigningOut} onClick={signOut}>
                {isSigningOut ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LogOutIcon />
                )}
                {isSigningOut ? "Signing out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@geho/ui/components/breadcrumb";
import { SidebarTrigger } from "@geho/ui/components/sidebar";
import { Link, useMatches } from "@tanstack/react-router";
import { Fragment } from "react";

export const DashboardHeader = () => {
  const breadcrumbs = useMatches({
    select: (matches) => matches.at(-1)?.context.breadcrumbs ?? [],
  });

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full min-w-0 items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap font-medium text-base">
            <BreadcrumbItem
              className={breadcrumbs.length > 0 ? "hidden md:block" : "min-w-0"}
            >
              {breadcrumbs.length > 0 ? (
                <BreadcrumbLink render={<Link to="/">Workspace</Link>} />
              ) : (
                <BreadcrumbPage className="truncate">Workspace</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {breadcrumbs.map((breadcrumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;

              return (
                <Fragment key={breadcrumb.id}>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem
                    className={isCurrent ? "min-w-0" : "hidden md:block"}
                  >
                    {isCurrent ? (
                      <BreadcrumbPage
                        className="max-w-64 truncate"
                        title={breadcrumb.label}
                      >
                        {breadcrumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        render={<Link {...breadcrumb.linkOptions} />}
                      >
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
};

import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import {
  type OrganizationPermission,
  organizationPermissionQueryOptions,
} from "@/queries/organization-permission";

export const useOrganizationPermission = (
  permission: OrganizationPermission
) => {
  // Get organization from route context
  const { organization } = useRouteContext({
    from: "/_app/_workspace",
  });

  const { data } = useSuspenseQuery(
    organizationPermissionQueryOptions(organization.id, permission)
  );

  return data;
};

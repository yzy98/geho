import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

function isApiErrorWithCode(
  data: unknown,
  code: string
): data is { code: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    (data as { code: unknown }).code === code
  );
}

async function getCurrentOrganizationResult() {
  const response = await apiClient.organizations.current.$get();

  if (response.ok) {
    const { organization } = await response.json();
    return {
      status: "ok" as const,
      organization,
    };
  }

  const data = await response.json();

  if (
    response.status === 403 &&
    isApiErrorWithCode(data, "ORGANIZATION_ONBOARDING_REQUIRED")
  ) {
    return {
      status: "onboarding_required" as const,
    };
  }

  if (
    response.status === 403 &&
    isApiErrorWithCode(data, "ORGANIZATION_MEMBERSHIP_REQUIRED")
  ) {
    return {
      status: "membership_required" as const,
    };
  }

  return {
    status: "error" as const,
    error: {
      status: response.status,
      data,
    },
  };
}

type OrganizationQueryResult = Awaited<
  ReturnType<typeof getCurrentOrganizationResult>
>;

export type CurrentOrganization = Extract<
  OrganizationQueryResult,
  { status: "ok" }
>["organization"];

export const organizationQueryOptions = () =>
  queryOptions({
    queryKey: ["current-organization"],
    queryFn: getCurrentOrganizationResult,
    staleTime: 30_000,
  });

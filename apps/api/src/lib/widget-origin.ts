const normalizeWidgetOrigin = (value: string): string | null => {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    if (url.pathname !== "/" || url.search || url.hash) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

export const isSerializedWidgetOrigin = (value: string): boolean =>
  normalizeWidgetOrigin(value) === value;

export const isAllowedWidgetOrigin = ({
  origin,
  allowedDomains,
}: {
  origin: string;
  allowedDomains: string[];
}): boolean => {
  if (allowedDomains.length === 0) {
    return false;
  }

  return allowedDomains.some(
    (allowedDomain) => normalizeWidgetOrigin(allowedDomain) === origin
  );
};

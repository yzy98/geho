import geistFontUrl from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?inline";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import widgetCss from "@/style.css?inline";

const shadowStyles = `
  @font-face {
    font-family: "Geist Variable";
    src: url("${geistFontUrl}") format("woff2");
    font-display: swap;
    font-style: normal;
    font-weight: 100 900;
  }

  ${widgetCss}
  `;

type WidgetShadowRootProps = {
  children: ReactNode;
};

export function WidgetShadowRoot({ children }: WidgetShadowRootProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<globalThis.ShadowRoot | null>(
    null
  );

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    setShadowRoot(host.shadowRoot ?? host.attachShadow({ mode: "open" }));
  }, []);

  return (
    <>
      <div data-heho-widget-host="" ref={hostRef} />

      {shadowRoot
        ? createPortal(
            <>
              <style data-heho-widget-styles="">{shadowStyles}</style>

              <div className="heho-widget-root">{children}</div>
            </>,
            shadowRoot
          )
        : null}
    </>
  );
}

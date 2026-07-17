import type { AuthServer } from "@heho/auth/server";
import type { WidgetScope } from "./services/widget-access";
import type { AuthorizedWidgetSession } from "./services/widget-session-access";

export interface AppEnv {
  Variables: Variables;
}

export interface Variables {
  organization: Organization;
  session: Session;
  user: User;
}

export type User = AuthServer["$Infer"]["Session"]["user"];
export type Session = AuthServer["$Infer"]["Session"]["session"];
export type Organization = AuthServer["$Infer"]["Organization"];

export interface WidgetEnv {
  Variables: {
    widgetScope: WidgetScope;
  };
}

export interface WidgetSessionEnv {
  Variables: {
    widgetScope: WidgetScope;
    widgetSession: AuthorizedWidgetSession;
  };
}

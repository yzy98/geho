import type { AuthServer } from "@heho/auth/server";

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

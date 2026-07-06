import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statements = {
  ...defaultStatements,
  llmProvider: ["create", "read", "update", "delete"],
  knowledgeBase: ["create", "read", "update", "delete"],
  knowledgeSource: ["create", "read", "delete", "retry"],
  chatbot: ["create", "read", "update", "delete"],
  embedKey: ["create", "read", "revoke"],
} as const;

export const organizationAC = createAccessControl(statements);

const owner = organizationAC.newRole({
  ...ownerAc.statements,
  llmProvider: ["create", "read", "update", "delete"],
  knowledgeBase: ["create", "read", "update", "delete"],
  knowledgeSource: ["create", "read", "delete", "retry"],
  chatbot: ["create", "read", "update", "delete"],
  embedKey: ["create", "read", "revoke"],
});

const member = organizationAC.newRole({
  ...memberAc.statements,
  llmProvider: ["read"],
  knowledgeBase: ["read"],
  knowledgeSource: ["read"],
  chatbot: ["read"],
  embedKey: ["read"],
});

export const organizationRoles = {
  owner,
  member,
} as const;

export type OrganizationPermissionRequest = {
  [Resource in keyof typeof statements]?: (typeof statements)[Resource][number][];
};

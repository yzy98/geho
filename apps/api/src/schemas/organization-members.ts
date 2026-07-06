import z from "zod";

export const addOrganizationMemberSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
  })
  .strict();

export type AddOrganizationMemberInput = z.infer<
  typeof addOrganizationMemberSchema
>;

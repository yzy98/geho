import { createHash, randomBytes } from "node:crypto";

const SESSION_TOKEN_PREFIX = "st_";
const SESSION_TOKEN_RANDOM_BYTES = 32;
const SESSION_TOKEN_PATTERN = /^st_[A-Za-z0-9_-]{43}$/;

export const generateSessionToken = () =>
  `${SESSION_TOKEN_PREFIX}${randomBytes(SESSION_TOKEN_RANDOM_BYTES).toString("base64url")}`;

export const hashSessionToken = (rawToken: string) =>
  createHash("sha256").update(rawToken, "utf8").digest("hex");

export const isSessionToken = (value: string): boolean =>
  SESSION_TOKEN_PATTERN.test(value);

import { randomBytes } from "node:crypto";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";

const AUTH_SECRET_PLACEHOLDER = "replace-me-with-a-random-secret";
const ENCRYPTION_KEY_PLACEHOLDER = "replace-me-with-32-byte-base64-key";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const createAuthSecret = () => randomBytes(32).toString("base64url");

const createEncryptionKey = () => randomBytes(32).toString("base64url");

const validateAuthSecret = (value) => {
  if (!value || value.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must contain at least 32 characters. Remove its value and re-run pnpm setup to generate one."
    );
  }
};

const validateEncryptionKey = (value) => {
  if (!(value && BASE64URL_PATTERN.test(value))) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be an unpadded base64url value. Remove its value and re-run pnpm setup to generate one."
    );
  }

  const decoded = Buffer.from(value, "base64url");

  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== value) {
    throw new Error(
      "APP_ENCRYPTION_KEY must decode to exactly 32 bytes. Remove its value and re-run pnpm setup to generate one."
    );
  }
};

const validateDatabaseUrl = (value) => {
  if (!value) {
    throw new Error("DATABASE_URL is required in .env.");
  }

  const url = new URL(value);

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
  }
};

const setEnvironmentValue = (contents, key, value) => {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "gm");

  if (pattern.test(contents)) {
    return contents.replace(pattern, line);
  }

  const suffix = contents.endsWith("\n") ? "" : "\n";

  return `${contents}${suffix}${line}\n`;
};

export const prepareEnvironment = async ({ envPath, examplePath }) => {
  let created = false;
  let contents;

  try {
    contents = await readFile(envPath, "utf-8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await copyFile(examplePath, envPath);
    contents = await readFile(envPath, "utf-8");
    created = true;
  }

  const values = parse(contents);
  const generated = [];

  const authSecret =
    !values.BETTER_AUTH_SECRET ||
    values.BETTER_AUTH_SECRET === AUTH_SECRET_PLACEHOLDER
      ? createAuthSecret()
      : values.BETTER_AUTH_SECRET;

  if (authSecret !== values.BETTER_AUTH_SECRET) {
    contents = setEnvironmentValue(contents, "BETTER_AUTH_SECRET", authSecret);
    generated.push("BETTER_AUTH_SECRET");
  }

  const encryptionKey =
    !values.APP_ENCRYPTION_KEY ||
    values.APP_ENCRYPTION_KEY === ENCRYPTION_KEY_PLACEHOLDER
      ? createEncryptionKey()
      : values.APP_ENCRYPTION_KEY;

  if (encryptionKey !== values.APP_ENCRYPTION_KEY) {
    contents = setEnvironmentValue(
      contents,
      "APP_ENCRYPTION_KEY",
      encryptionKey
    );
    generated.push("APP_ENCRYPTION_KEY");
  }

  const updatedValues = parse(contents);

  validateAuthSecret(updatedValues.BETTER_AUTH_SECRET);
  validateEncryptionKey(updatedValues.APP_ENCRYPTION_KEY);
  validateDatabaseUrl(updatedValues.DATABASE_URL);

  await writeFile(envPath, contents);

  return {
    created,
    generated,
  };
};

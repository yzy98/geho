import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";
import { prepareEnvironment } from "./setup-env.js";

const databaseUrl = "postgres://geho:geho@localhost:5432/geho";
const redisUrl = "redis://localhost:6379";
const validAuthSecret = "a".repeat(32);
const validEncryptionKey = Buffer.alloc(32, 7).toString("base64url");

const exampleEnvironment = `
 DATABASE_URL=${databaseUrl}
 REDIS_URL=${redisUrl}
 BETTER_AUTH_SECRET=replace-me-with-a-random-secret
 APP_ENCRYPTION_KEY=replace-me-with-32-byte-base64-key
 `.trimStart();

const fixtureDirectories = new Set();

afterEach(async () => {
  await Promise.all(
    [...fixtureDirectories].map((directory) =>
      rm(directory, {
        force: true,
        recursive: true,
      })
    )
  );

  fixtureDirectories.clear();
});

const createFixture = async ({
  environment,
  example = exampleEnvironment,
} = {}) => {
  const directory = await mkdtemp(join(tmpdir(), "geho-setup-env-"));
  const envPath = join(directory, ".env");
  const examplePath = join(directory, ".env.example");

  fixtureDirectories.add(directory);
  await writeFile(examplePath, example);

  if (environment !== undefined) {
    await writeFile(envPath, environment);
  }

  return {
    envPath,
    examplePath,
  };
};

describe("prepareEnvironment", () => {
  it("creates .env from the example and replaces placeholders", async () => {
    const { envPath, examplePath } = await createFixture();

    const result = await prepareEnvironment({
      envPath,
      examplePath,
    });

    const values = parse(await readFile(envPath, "utf-8"));

    expect(result).toEqual({
      created: true,
      generated: ["BETTER_AUTH_SECRET", "APP_ENCRYPTION_KEY"],
    });

    expect(values.DATABASE_URL).toBe(databaseUrl);
    expect(values.REDIS_URL).toBe(redisUrl);

    expect(values.BETTER_AUTH_SECRET).not.toBe(
      "replace-me-with-a-random-secret"
    );
    expect(values.BETTER_AUTH_SECRET).toHaveLength(43);

    expect(values.APP_ENCRYPTION_KEY).not.toBe(
      "replace-me-with-32-byte-base64-key"
    );
    expect(Buffer.from(values.APP_ENCRYPTION_KEY, "base64url").byteLength).toBe(
      32
    );
  });

  it("adds missing secrets without changing unrelated values", async () => {
    const environment = `
 # Preserve this comment.
 DATABASE_URL=${databaseUrl}
 REDIS_URL=${redisUrl}
 CUSTOM_VALUE=keep-me
 `.trimStart();

    const { envPath, examplePath } = await createFixture({
      environment,
    });

    const result = await prepareEnvironment({
      envPath,
      examplePath,
    });

    const contents = await readFile(envPath, "utf8");
    const values = parse(contents);

    expect(result).toEqual({
      created: false,
      generated: ["BETTER_AUTH_SECRET", "APP_ENCRYPTION_KEY"],
    });
    expect(contents).toContain("# Preserve this comment.");
    expect(values.CUSTOM_VALUE).toBe("keep-me");
    expect(values.BETTER_AUTH_SECRET).toHaveLength(43);
    expect(Buffer.from(values.APP_ENCRYPTION_KEY, "base64url").byteLength).toBe(
      32
    );
  });

  it("preserves valid existing secrets", async () => {
    const environment = `
DATABASE_URL=${databaseUrl}
REDIS_URL=${redisUrl}
BETTER_AUTH_SECRET=${validAuthSecret}
APP_ENCRYPTION_KEY=${validEncryptionKey}
`.trimStart();

    const { envPath, examplePath } = await createFixture({
      environment,
    });

    const result = await prepareEnvironment({
      envPath,
      examplePath,
    });

    const values = parse(await readFile(envPath, "utf8"));

    expect(result).toEqual({
      created: false,
      generated: [],
    });
    expect(values.BETTER_AUTH_SECRET).toBe(validAuthSecret);
    expect(values.APP_ENCRYPTION_KEY).toBe(validEncryptionKey);
  });

  it("rejects an invalid encryption key without overwriting .env", async () => {
    const environment = `
DATABASE_URL=${databaseUrl}
BETTER_AUTH_SECRET=${validAuthSecret}
APP_ENCRYPTION_KEY=not-a-valid-32-byte-key
`.trimStart();

    const { envPath, examplePath } = await createFixture({
      environment,
    });

    await expect(
      prepareEnvironment({
        envPath,
        examplePath,
      })
    ).rejects.toThrow("APP_ENCRYPTION_KEY must decode to exactly 32 bytes");
    await expect(readFile(envPath, "utf8")).resolves.toBe(environment);
  });

  it("rejects an environment without DATABASE_URL", async () => {
    const environment = `
BETTER_AUTH_SECRET=${validAuthSecret}
APP_ENCRYPTION_KEY=${validEncryptionKey}
`.trimStart();

    const { envPath, examplePath } = await createFixture({
      environment,
    });

    await expect(
      prepareEnvironment({
        envPath,
        examplePath,
      })
    ).rejects.toThrow("DATABASE_URL is required in .env.");

    await expect(readFile(envPath, "utf8")).resolves.toBe(environment);
  });
});

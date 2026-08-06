import { randomBytes } from "node:crypto";
import { base64url, CompactEncrypt, decodeProtectedHeader } from "jose";
import { describe, expect, it } from "vitest";
import {
  ApiKeyEncryptionError,
  decodeEncryptionKey,
  decryptApiKey,
  encryptApiKey,
} from "./api-key-encryption";

const createEncryptionKey = () => new Uint8Array(randomBytes(32));

describe("API key encryption", () => {
  it("round-trips the original API key without normalizing it", async () => {
    const encryptionKey = createEncryptionKey();
    const apiKey = "  sk-密钥-value  ";

    const encryptedApiKey = await encryptApiKey({
      apiKey,
      encryptionKey,
    });

    await expect(
      decryptApiKey({ encryptedApiKey, encryptionKey })
    ).resolves.toBe(apiKey);
  });

  it("uses a new initialization vector for each encryption", async () => {
    const encryptionKey = createEncryptionKey();
    const options = { apiKey: "sk-same-value", encryptionKey };

    const first = await encryptApiKey(options);
    const second = await encryptApiKey(options);

    expect(first).not.toBe(second);
  });

  it("sets the expected protected header", async () => {
    const encryptedApiKey = await encryptApiKey({
      apiKey: "sk-value",
      encryptionKey: createEncryptionKey(),
    });

    expect(decodeProtectedHeader(encryptedApiKey)).toEqual({
      alg: "dir",
      enc: "A256GCM",
      kid: "v1",
    });
  });

  it("rejects empty API keys", async () => {
    await expect(
      encryptApiKey({
        apiKey: "   ",
        encryptionKey: createEncryptionKey(),
      })
    ).rejects.toThrow(ApiKeyEncryptionError);
  });

  it("rejects keys that are not exactly 32 bytes", async () => {
    await expect(
      encryptApiKey({
        apiKey: "sk-value",
        encryptionKey: new Uint8Array(31),
      })
    ).rejects.toThrow("Encryption key must be exactly 32 bytes");
  });

  it("rejects decryption with a different key", async () => {
    const encryptedApiKey = await encryptApiKey({
      apiKey: "sk-value",
      encryptionKey: createEncryptionKey(),
    });

    await expect(
      decryptApiKey({
        encryptedApiKey,
        encryptionKey: createEncryptionKey(),
      })
    ).rejects.toThrow(ApiKeyEncryptionError);
  });

  it("rejects tampered ciphertext", async () => {
    const encryptionKey = createEncryptionKey();
    const encryptedApiKey = await encryptApiKey({
      apiKey: "sk-value",
      encryptionKey,
    });
    const parts = encryptedApiKey.split(".");
    const ciphertext = parts[3];

    if (!ciphertext) {
      throw new Error("Expected a Compact JWE ciphertext");
    }

    parts[3] = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;

    await expect(
      decryptApiKey({
        encryptedApiKey: parts.join("."),
        encryptionKey,
      })
    ).rejects.toThrow(ApiKeyEncryptionError);
  });

  it("rejects an unknown key ID", async () => {
    const encryptionKey = createEncryptionKey();
    const encryptedApiKey = await new CompactEncrypt(
      new TextEncoder().encode("sk-value")
    )
      .setProtectedHeader({
        alg: "dir",
        enc: "A256GCM",
        kid: "v2",
      })
      .encrypt(encryptionKey);

    await expect(
      decryptApiKey({ encryptedApiKey, encryptionKey })
    ).rejects.toThrow("Unsupported encryption key ID: v2");
  });
});

describe("encryption key decoding", () => {
  it("decodes a 32-byte unpadded base64url key", () => {
    const encryptionKey = createEncryptionKey();
    const encodedKey = base64url.encode(encryptionKey);

    expect(decodeEncryptionKey(encodedKey)).toEqual(encryptionKey);
  });

  it("rejects invalid base64url", () => {
    expect(() => decodeEncryptionKey("***")).toThrow(
      "Encryption key must be valid unpadded base64url"
    );
  });

  it("rejects a decoded key with the wrong length", () => {
    expect(() =>
      decodeEncryptionKey(base64url.encode(randomBytes(31)))
    ).toThrow("Encryption key must be exactly 32 bytes");
  });
});

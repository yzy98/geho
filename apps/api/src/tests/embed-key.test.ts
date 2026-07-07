import { describe, expect, it } from "vitest";
import {
  generateEmbedKey,
  getEmbedKeyPrefix,
  hashEmbedKey,
  isEmbedKey,
} from "../lib/embed-key";

describe("embed key generation", () => {
  it("generates a valid key with 32 bytes of random payload", () => {
    const key = generateEmbedKey();
    const payload = key.slice("pk_".length);

    expect(isEmbedKey(key)).toBe(true);
    expect(Buffer.from(payload, "base64url")).toHaveLength(32);
  });

  it("generates a different key for each call", () => {
    expect(generateEmbedKey()).not.toBe(generateEmbedKey());
  });
});

describe("embed key hashing", () => {
  it("returns the expected lowercase SHA-256 hex digest", () => {
    expect(hashEmbedKey("pk_test-value")).toBe(
      "c40c93e802ceec0bb3a78f2f9e153c2cf29c5807a0a1ac0cc0c637fc60e316e0"
    );
  });

  it("returns the same digest for the same key", () => {
    const key = generateEmbedKey();

    expect(hashEmbedKey(key)).toBe(hashEmbedKey(key));
  });
});

describe("embed key display prefix", () => {
  it("returns a shortened prefix without exposing the full key", () => {
    const key = "pk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
    const prefix = getEmbedKeyPrefix(key);

    expect(prefix).toBe("pk_abcdefgh…");
    expect(prefix).not.toContain(key);
  });
});

describe("embed key validation", () => {
  it.each([
    "",
    "pk_",
    "sk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ",
    "pk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP",
    "pk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQR",
    "pk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN+PQ",
    "pk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN/PQ",
    "pk_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN=PQ",
  ])("rejects invalid key %j", (key) => {
    expect(isEmbedKey(key)).toBe(false);
  });
});

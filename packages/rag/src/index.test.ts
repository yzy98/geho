import { describe, expect, it } from "vitest";
import { getChunks } from ".";

describe("getChunks", () => {
  it("returns no chunks for empty text", async () => {
    await expect(getChunks("")).resolves.toEqual([]);
    await expect(getChunks("   \n\t   ")).resolves.toEqual([]);
  });

  it("returns one trimmed chunk for short text", async () => {
    await expect(getChunks("  hello world  ")).resolves.toEqual([
      {
        chunkIndex: 0,
        content: "hello world",
      },
    ]);
  });

  it("assigns contiguous chunk indexes", async () => {
    const chunks = await getChunks("a ".repeat(200), {
      chunkSize: 40,
      chunkOverlap: 10,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(
      chunks.map((_, index) => index)
    );
  });

  it("filters out blank chunks after trimming", async () => {
    const chunks = await getChunks("\n\nhello\n\n", {
      chunkSize: 10,
      chunkOverlap: 0,
    });

    expect(chunks).toEqual([
      {
        chunkIndex: 0,
        content: "hello",
      },
    ]);
  });

  it("normalizes CRLF-compatible input into stable chunks", async () => {
    const input = "first line\r\nsecond line\rthird line";

    const first = await getChunks(input, {
      chunkSize: 12,
      chunkOverlap: 0,
    });
    const second = await getChunks(input, {
      chunkSize: 12,
      chunkOverlap: 0,
    });

    expect(first).toEqual(second);
    expect(first.map((chunk) => chunk.content).join("\n")).toContain(
      "first line"
    );
  });

  it("uses custom chunk size and overlap", async () => {
    const input = "abcdefghijklmnopqrstuvwxyz";

    const chunks = await getChunks(input, {
      chunkSize: 10,
      chunkOverlap: 2,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= 10)).toBe(true);
  });

  it("is deterministic for the same input and options", async () => {
    const input = [
      "Paragraph one has some text.",
      "",
      "Paragraph two has more text.",
      "Paragraph three has the final text.",
    ].join("\n");

    const options = {
      chunkSize: 30,
      chunkOverlap: 5,
    };

    await expect(getChunks(input, options)).resolves.toEqual(
      await getChunks(input, options)
    );
  });
});

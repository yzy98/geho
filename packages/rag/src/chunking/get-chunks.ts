import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from "./constants";
import type { Chunk, GetChunksOptions } from "./types";

export const getChunks = async (
  rawText: string,
  options?: GetChunksOptions
): Promise<Chunk[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options?.chunkSize ?? DEFAULT_CHUNK_SIZE,
    chunkOverlap: options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
  });

  const contents = await splitter.splitText(rawText);

  return contents
    .map((content) => content.trim())
    .filter((content) => content.length > 0)
    .map((content, chunkIndex) => ({
      content,
      chunkIndex,
    }));
};

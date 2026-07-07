import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export type Chunk = {
  chunkIndex: number;
  content: string;
};

export type GetChunksOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 200;

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

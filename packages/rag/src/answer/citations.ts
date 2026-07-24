import type { RagCitation, RagContextChunk } from "./types";

export const resolveCitedChunks = ({
  citedChunkIds,
  chunks,
}: {
  citedChunkIds: readonly string[];
  chunks: readonly RagContextChunk[];
}): RagContextChunk[] => {
  const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
  const seen = new Set<string>();

  return citedChunkIds.flatMap((chunkId) => {
    if (seen.has(chunkId)) {
      return [];
    }

    const chunk = chunksById.get(chunkId);

    if (!chunk) {
      return [];
    }

    seen.add(chunkId);
    return [chunk];
  });
};

export const resolveCitations = ({
  citedChunkIds,
  chunks,
}: {
  citedChunkIds: readonly string[];
  chunks: readonly RagContextChunk[];
}): RagCitation[] =>
  resolveCitedChunks({
    citedChunkIds,
    chunks,
  }).map((chunk) => ({
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    chunkIndex: chunk.chunkIndex,
    similarity: chunk.similarity,
  }));

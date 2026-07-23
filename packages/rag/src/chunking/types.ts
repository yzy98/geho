export type Chunk = {
  chunkIndex: number;
  content: string;
};

export type GetChunksOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

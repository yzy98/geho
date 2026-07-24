import { ragAnswerSchema } from "@geho/rag";
import { Output } from "ai";

export const ragAnswerOutput = Output.object({
  schema: ragAnswerSchema,
  name: "citedAnswer",
  description: "An answer with citations to retrieved chunk IDs.",
});

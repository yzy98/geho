import type { RedisOptions } from "ioredis";
import IORedis from "ioredis";

export const createRedisConnection = (
  redisURL: string,
  options: RedisOptions
) => new IORedis(redisURL, options);

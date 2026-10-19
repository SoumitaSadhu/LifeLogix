import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined. Add your Upstash Redis connection string to the .env file.");
}

const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => (attempt >= 5 ? null : Math.min(attempt * 500, 2000)),
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err: Error) => {
  console.error("Redis error:", err.message);
});

export default redis;
import { createClient } from 'redis';
import logger from "../logger"

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => {
  logger.error(`Redis client error on ${redisUrl}`, err)
});

redisClient.on('connect', () => {
  logger.info(`Connected to Redis on ${redisUrl}`);
});

redisClient.on('ready', () => {
  logger.info("redis is ready");
});

(async () => {
  await redisClient.connect()
})();

export default redisClient
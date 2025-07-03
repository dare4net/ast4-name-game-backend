const { Redis } = require('@upstash/redis');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN
});

module.exports = redis;

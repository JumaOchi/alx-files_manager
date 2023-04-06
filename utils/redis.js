import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    const client = createClient()
      .on('error', (err) => {
        console.log(err);
      });
    this.client = client;
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const get = promisify(this.client.get).bind(this.client);
    const value = await get(key);
    return value;
  }

  async set(key, value, duration) {
    const set = promisify(this.client.set).bind(this.client);
    await set(key, value);
    await this.client.expire(key, duration);
  }

  async del(key) {
    const del = promisify(this.client.del).bind(this.client);
    await del(key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;

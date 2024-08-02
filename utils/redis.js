#!/usr/bin/node
const { createClient } = require('redis');
const { promisify } = require('util');

class RedisClient {
  // constructor creating a redis client.
  constructor() {
    this.client = createClient()
      .on('connect', () => {
      })
      .on('error', (err) => {
        console.log(err);
      });

    this.getAsync = promisify(this.client.GET).bind(this.client);
    this.setAsync = promisify(this.client.SET).bind(this.client);
    this.delAsync = promisify(this.client.DEL).bind(this.client);
  }

  // isAlive return ture if connection successful.
  isAlive() {
		return this.client.connected;
  }

  // async get function
  async get(key) {
    try {
      const result = await this.getAsync(key);
      return result;
    } catch (err) {
      console.error(err);
    }
  }

  // async set fucntion
  async set(key, value, duration) {
    try {
      await this.setAsync(key, value);
      await this.client.expire(key, duration);
    } catch (err) {
      console.error(err);
    }
  }

  // async del function
  async del(key) {
    try {
      const response = await this.client.DEL(key);
      console.log(response);
    } catch (err) {
      console.error(err);
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;

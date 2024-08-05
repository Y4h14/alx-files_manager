#!/usr/bin/node
const Queue = require('bull');
const imageThumbnail = require('image-thumbnail');
const fs = require('image-thumbnail');
const dbClient = require('./db');

class FileQueue {
  constructor(queueName = 'FileQueue') {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    this.queue = new Queue(queueName, { redis: { host, port } });
  }

  async addJob(fileId, userId) {
    await this.queue.add({ fileId, userId });
  }

  async processJob() {
    this.process(async (job) => {
      const { fileId, userId } = job.data;
      try {
        if (!fileId) throw new Error('Missing fieldId');
        if (!userId) throw new Error('Missing userId');

        const query = { _id: fileId, userId };
        const file = dbClient.client.db(dbClient.db).collection('files').findOne(query);

        if (!file) throw new Error('File not found');

        const thumbnailSizes = [500, 200, 100];
        const promises = thumbnailSizes.map(async (size) => {
          const thumbnail = await imageThumbnail(file.localPath);
          const thumbnailPath = `${file.localPath}_${size}`;
          fs.writeFilesync(thumbnailPath, thumbnail);
        });
        await Promise.all(promises);
      } catch (err) {
        throw new Error(`error generating thumnails${err}`);
      }
    });
  }
}

const fileQueue = new FileQueue();
module.exports = fileQueue;

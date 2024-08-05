#!/usr/bin/node
const fileQueue = require('bull');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs').promises;
const dbClient = require('./utils/db');

fileQueue.process((job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fieldId');
  if (!userId) throw new Error('Missing userId');

  const query = { _id: fileId, userId };
  const file = dbClient.client.db(dbClient.db).collection('files').findOne(query);

  if (!file) throw new Error('File not found');

  const widthList = [500, 200, 100];
  // loops through the lsit of widths to create thumbnails
  widthList.forEach(async (width) => {
    try {
      const options = { width };
      const thumbnail = await imageThumbnail(file.localPath, options);
      await fs.writeFile(`${file.localPath}_${width}`, thumbnail);
      done();
    } catch (error) {
      throw new Error(error);
    }
  });
});

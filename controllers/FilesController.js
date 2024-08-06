#!/usr/bin/node
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const fileQueue = require('../utils/queue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name, type, data,
    } = req.body;
    let { parentId, isPublic } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.client.db(dbClient.db).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (!parentId) {
      parentId = 0;
    } else {
      parentId = new ObjectId(parentId);
    }
    if (!isPublic) {
      isPublic = false;
    }

    if (parentId !== 0) {
      const parent_ = await dbClient.client.db(dbClient.db).collection('files').findOne({ _id: parentId });
      if (!parent_) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent_.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const doc = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic: !!isPublic,
        parentId,
      };
      const result = await dbClient.client.db(dbClient.db).collection('files').insertOne(doc);
      const file = result.ops[0];
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fileBuffer = Buffer.from(data, 'base64');
    const fileName = uuidv4();
    const filePath = path.join(folderPath, fileName);

    try {
      fs.writeFileSync(filePath, fileBuffer);
      const doc = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic: !!isPublic,
        parentId,
        localPath: filePath,
      };
      const result = await dbClient.client.db(dbClient.db).collection('files').insertOne(doc);
      const file = result.ops[0];
      // adding a job to the bull queue to create thumbnail
      if (file.type === 'image') {
        fileQueue.addJob(result.insertedId, userId);
      }
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.client.db(dbClient.db).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const query = { _id: new ObjectId(id), userId: new ObjectId(userId) };
    const file = await dbClient.client.db(dbClient.db).collection('files').findOne(query);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    let { parentId, page } = req.query;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.client.db(dbClient.db).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!parentId || parentId === '0') {
      parentId = 0;
    } else {
      parentId = new ObjectId(parentId);
    }

    if (!page) {
      page = 0;
    }
    page = parseInt(page, 10);
    const pageSize = 20;
    const skip = page * pageSize;
    const limit = pageSize;

    const pipeline = [
      { $skip: skip },
      { $limit: limit },
    ];

    if (parentId !== 0) {
      pipeline.push({ $match: { userId: new ObjectId(userId), parentId } });
    }

    const result = await dbClient.client.db(dbClient.db).collection('files').aggregate(pipeline).toArray();
    const files = [];

    result.forEach((file) => {
      files.push({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    });

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.client.db(dbClient.db).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const query = { _id: new ObjectId(id), userId: new ObjectId(userId) };
    let file = await dbClient.client.db(dbClient.db).collection('files').findOne(query);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      const update = { $set: { isPublic: true } };
      await dbClient.client.db(dbClient.db).collection('files').updateOne({ _id: new ObjectId(id) }, update);
      file = await dbClient.client.db(dbClient.db).collection('files').findOne(query);
      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.client.db(dbClient.db).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let file = await dbClient.client.db(dbClient.db).collection('files').findOne({ _id: new ObjectId(id) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      const update = { $set: { isPublic: false } };
      await dbClient.client.db(dbClient.db).collection('files').updateOne({ _id: new ObjectId(id) }, update);
      file = await dbClient.client.db(dbClient.db).collection('files').findOne({ _id: new ObjectId(id) });
      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getFile(req, res) {
    const { id, size } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    const file = await dbClient.client.db(dbClient.db).collection('files').findOne({ _id: new ObjectId(id) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.isPublic === false) {
      if (!userId || file.userId.toString() !== userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // here we modify the file path to acocunt for the size
    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const contentType = mime.contentType(file.name);
    if (contentType) {
      res.type(contentType);
    }
    return res.sendFile(filePath);
  }
}
module.exports = FilesController;

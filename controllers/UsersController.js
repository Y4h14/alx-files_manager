#!/usr/bin/node
import { ObjectId } from 'mongodb';

const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UserController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const hashedPassword = crypto.createHash('sha1')
      .update(password).digest('hex');

    try {
      const database = dbClient.db;
      const usersCollection = dbClient.client.db(database).collection('users');
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const newUser = { email, password: hashedPassword };
      const result = await usersCollection.insertOne(newUser);
      return res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'server error' });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.client.db(dbClient.db).collection('users').findOne({ _id: new ObjectId(id) });
    res.status(200).json({ id, email: user.email });
  }
}
module.exports = UserController;

#!/usr/bin/node
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController{
	static getStatus(req, res) {
		res.statusCode = 200;

		const redis = redisClient.isAlive();
		const db = dbClient.isAlive();

		res.send({'redis': redis, 'db': db});
	}

	static async getStats(req, res) {
		res.statusCode = 200;

		const nbFiles = await dbClient.nbFiles();
		const nbUsers = await dbClient.nbUsers();

		res.send({'users': nbUsers, 'files': nbFiles});
	}
}
module.exports = AppController;

#!/usr/bin/node
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

class AuthController {
	static async getConnect(req, res) {
		const auth = req.headers.Authorization;
		if (!auth) {
			res.status(401).json({'error': 'Unauthorized'});
		}
		const encodedAuth = auth.split(' ')[1];
		const decodedAuth = Buffer.from(encodedAuth, 'base64').toString('utf-8');
		const [email, password] = decodedAuth.split(':');
		if (!email || !password) {
			res.status(401).json({'error': 'Unauthorized'});
		}
		const hashedPassword = crypto.createHash('sha1')
			.update(password).digest('hex');

		const query = {'email': email, 'password': hashedPassword};

		try {
			const user = await dbClient.client.db().collection('users').findOne(query);
			if (user) {
				const uid = uuidv4();
				await redisClient.set(`auth_${uid}`, user._id.toString(), 86400);
				res.status(200).json({'token': uid}):
			}
			else {
				res.status(401).json({'error': 'Unauthorized'});
			}
		} catch (error) {
			res.status(401).json({'error': 'Unauthorized'});
		}
	}

	static async getDisconnect(req, res) {
		const token = req.headers['X-Token'];

		const id = await redisClient.get(`auth_${token}`);
		if (!id) {
			res.status(401).json({'error': 'Unauthorized'});
		}
		await redisClient.del(`auth_${token}`);
		res.status(204);
	}
}


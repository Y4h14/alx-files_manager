#!/usr/bin/node
const { MongoClient } = require('mongodb');

class DBClient {
	constructor() {
		const host = process.env.DB_HOST || 'localhost';
		const port = process.env.DB_PORT || '27017';
		const database = process.env.DB_DATABASE || 'files_manager';

		this.uri = `mongodb://${host}:${port}`;
		this.client = new MongoClient(this.uri, { useNewUrlParser: true, useUnifiedTopology: true });

		this.client.connect().catch((err) => {
			console.error('Failed to connect to MongoDB', err);
		});
		this.db = database;
	}

	isAlive() {
		return this.client.isConnected();
	}

	async nbUsers() {
		const users = await this.client.db(this.db).collection('users');
		return users.countDocuments();
	}

	async nbFiles() {
		const files = await this.client.db(this.db).collection('files');
		return files.countDocuments();
	}
}

const dbClient = new DBClient();
module.exports = dbClient;

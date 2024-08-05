#!/usr/bin/node
// const fileQueue = require('bull');
// const imageThumbnail = require('image-thumbnail');
// const fs = require('fs');
// const dbClient = require('./utils/db');
const fileQueue = require('./utils/queue');

fileQueue.processJob();

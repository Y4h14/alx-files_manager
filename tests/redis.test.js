#!/usr/bin/node
const chai = require('chai');
const redisClient = require('../utils/redis');

describe('redis client test', () => {
    it('should be alive', () => {
      chai.expect(redisClient.isAlive()).to.be.true;
    });
});

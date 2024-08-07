#!/usr/bin/node
/* eslint-disable jest/no-hooks */
/* eslint-disable jest/valid-expect */
const { MongoClient } = require('mongodb');
const sinon = require('sinon');
const chai = require('chai');
const dbClient = require('../utils/db');

describe('database Client Test', () => {
  // eslint-disable-next-line jest/prefer-expect-assertions
  it('should have the correct URI', () => {
    chai.expect(dbClient.uri) .to.equal('mongodb://localhost:27017');
  });

  it('should be connected successfully', () => {
    chai.expect(dbClient.isAlive()).to.be.true;
  });
});

#!/usr/bin/node
const express = require('express');
const router = require('./routes/index');

const port = process.env.PORT || 5000;
const app = express();

// added this so that req would be parsed correctly
app.use(express.json());

app.use('/', router);

app.listen(port, () => {
  console.log(`server listining on port ${port}`);
});

module.exports = app;

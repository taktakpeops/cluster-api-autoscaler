'use strict';

const express = require('express');

const app = express();

app.get('/wait', (_, res) => {
  const time = Date.now();
  while (Date.now() < time + 2000); // eslint-disable-line curly

  res.json({ message: 'thank you for your patience' });
});

app.listen(9000, 'localhost', error => {
  if (error) {
    throw error;
  }
  console.log('the express server started on :::9000');
});

'use strict';

const app = require('express')();

app.get('/wait', (req, res) => {
  console.log('data');
  const time = Date.now();
  while (Date.now() < time + 1000); // eslint-disable-line curly

  res.sendStatus(200).json({ message: 'thank you for your patience' });
});

app.get('/', (req, res) => {
  res.json({ mess: 'hello' });
});

app.listen(9000, error => {
  if (error) {
    throw error;
  }
  console.log('the express server started on :::9000');
});

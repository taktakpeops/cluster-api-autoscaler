'use strict';

const http = require('http');

const server = http.createServer((req, resp) => {
  if (req.url === '/wait') {
    const time = Date.now();
    while (Date.now() < time + 1000); // eslint-disable-line curly
    resp.writeHead(200, { 'Content-Type': 'application/json' });
    resp.end(JSON.stringify({ message: 'thank you for your patience' }));
  }
});

server.listen(9000, () => {
  console.log('server has started :::9000');
});

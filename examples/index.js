'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const as = require('../src/master.js').start;

  const worker = cluster.fork();

  worker.on('message', data => {
    console.log(data);
  });
  as();
} else {
  require('../src/worker.js'); // eslint-disable-line import/no-unassigned-import
  console.log('hello');
  const time = Date.now();
  while (Date.now() < time + 1000); // eslint-disable-line curly
}

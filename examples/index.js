'use strict';

const as = require('../src/master.js').start;

as({
  workerScript: `${__dirname}/worker.js`,
  metrics: [
    {
      type: 'cpu',
      limit: 50,
    },
    {
      type: 'mem',
      limit: 50,
    },
  ],
  min: 1,
  max: 5,
});

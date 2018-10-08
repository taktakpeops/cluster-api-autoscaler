'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  throw new Error('The worker script cannot be run by the cluster master');
}

const { argv } = process;

if (argv.length < 2) {
  throw new TypeError('no bitch');
}

const {
  hrtimeToMS,
  usageToTotalUsageMS,
} = require('./modules/cpu');

if (cluster.isMaster) {
  throw new Error('The worker script cannot be run by the cluster master');
}

const ellapsedCpuTime = process.cpuUsage();
const ellapsedHrTime = process.hrtime();

const stop = setInterval(() => {
  if (cluster.worker.isConnected()) {
    process.send({
      type: 'cpu',
      elapsedCpuTime: hrtimeToMS(process.hrtime(ellapsedCpuTime)),
      ellapsedHrTime: usageToTotalUsageMS(process.hrtime(ellapsedHrTime)),
      time: Date.now(),
    });
  }
}, 500);

process.on('message', msg => msg === 'shutdown' ? stop.unref() : '');

'use strict';

const cluster = require('cluster');

const {
  hrtimeToMS,
  usageToTotalUsageMS,
} = require('./modules/cpu-utils');

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

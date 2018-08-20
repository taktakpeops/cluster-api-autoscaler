'use strict';

const cluster = require('cluster');

const { hrtimeToMS, usageToTotalUsageMS } = require('./cpu-utils');

if (cluster.isMaster) {
    throw new Error('The worker script cannot be run by the cluster master');
}

let ellapsedCpuTime = process.cpuUsage();
let ellapsedHrTime = process.hrtime();

const stop = setInterval(() => {
    if (cluster.worker.isConnected()) {
        process.send({
            type: 'metrics',
            elapsedCpuTime: hrtimeToMS(process.hrtime(startHrTime)),
            ellapsedHrTime: usageToTotalUsageMS(process.hrtime(ellapsedHrTime)),
            time: Date.now(),
        });
    }
}, 500);

process.on('message', (msg) => msg === 'shutdown' ? stop.unref() : '');
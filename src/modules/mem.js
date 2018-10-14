'use strict';

const cluster = require('cluster');
const os = require('os');
const { Module } = require('./module');

// the INTERVAL_TICKER can be overriden using environment
// example:
//  export INTERVAL_TICKER=500
const { INTERVAL_TICKER = '500' } = process.env;

const BYTE_TO_MB = 1024 ** 2;

class MemError extends TypeError { }

function getMemoryUsageInPercent() {
  const rssUsedMb = process.memoryUsage().rss / BYTE_TO_MB;
  const heapTotalMb = process.memoryUsage().heapTotal / BYTE_TO_MB;

  return (heapTotalMb / rssUsedMb * 100);
}

function canScaleUp() {
  const amountOfWorkers = Object.keys(cluster.workers).length;
  const totalUsedPerWorker = (os.totalmem() - os.freemem()) / amountOfWorkers;

  const totalNeededPerWorker = 0.3 * totalUsedPerWorker;

  return totalNeededPerWorker < (os.freemem() / amountOfWorkers);
}

class MemWatcher extends Module {
  startWatcher(handler) {
    const intervalTicker = parseInt(INTERVAL_TICKER, 10);

    if (isNaN(intervalTicker)) {
      throw new MemError(`Invalide INTERVAL_TICKER value: ${INTERVAL_TICKER} - please use a number`);
    }

    this.pid = setInterval(() => {
      process.nextTick(() => handler(getMemoryUsageInPercent()));
    }, intervalTicker);
  }

  stopWatcher() {
    this.pid.unref();
  }
}

module.exports = {
  MemError,
  canScaleUp,
  default: MemWatcher,
};

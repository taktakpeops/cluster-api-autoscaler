'use strict';

const { Module } = require('./module');

// the INTERVAL_TICKER can be overriden using environment
// example:
//  export INTERVAL_TICKER=500
const { INTERVAL_TICKER = '500' } = process.env;

const BYTE_TO_MB = 1024 ** 2;

class MemError extends TypeError { }

class MemWatcher extends Module {
  startWatcher(handler) {
    const intervalTicker = parseInt(INTERVAL_TICKER, 10);

    if (isNaN(intervalTicker)) {
      throw new MemError(`Invalide INTERVAL_TICKER value: ${INTERVAL_TICKER} - please use a number`);
    }

    this.pid = setInterval(() => {
      process.nextTick(() => {
        this.heapUsedMb = process.memoryUsage().heapUsed / BYTE_TO_MB;
        this.heapTotalMb = process.memoryUsage().heapTotal / BYTE_TO_MB;

        handler(this.heapUsedMb / this.heapTotalMb * 100);
      });
    }, intervalTicker);
  }

  stopWatcher() {
    this.pid.unref();
  }
}

module.exports = {
  MemError,
  default: MemWatcher,
};

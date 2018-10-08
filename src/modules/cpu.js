'use strict';

const { Module } = require('./module');

// the INTERVAL_TICKER can be overriden using environment
// example:
//  export INTERVAL_TICKER=500
const { INTERVAL_TICKER = '1000' } = process.env;

// nanosecond per second
const NS_PER_SEC = 1e9;
const NS_TO_MS = 1e6;

class CpuError extends TypeError {}

function hrtimeToMS(hrtime) {
  const timeInNs = (hrtime[0] * NS_PER_SEC) + hrtime[1];
  return timeInNs / NS_TO_MS;
}

function usageToTotalUsageMS(elapUsage) {
  const elapUserMS = elapUsage.user / 1000.0;
  const elapSystMS = elapUsage.system / 1000.0;

  return elapUserMS + elapSystMS;
}

function getCpuUsageInPercent(startHrTime, startCpuUsage) {
  const elapTimeMS = hrtimeToMS(process.hrtime(startHrTime));
  const elapUsageMS = usageToTotalUsageMS(process.cpuUsage(startCpuUsage));

  return (100.0 * elapUsageMS / elapTimeMS);
}

class CpuWatcher extends Module {
  startWatcher(handler) {
    const intervalTicker = parseInt(INTERVAL_TICKER, 10);

    if (isNaN(intervalTicker)) {
      throw new CpuError(`Invalide INTERVAL_TICKER value: ${INTERVAL_TICKER} - please use a number`);
    }

    this.elapsedCpuTime = process.cpuUsage();
    this.elapsedHrTime = process.hrtime();

    this.pid = setInterval(() => {
      this.elapsedCpuTime = process.cpuUsage(this.elapsedCpuTime);
      this.elapsedHrTime = process.hrtime(this.elapsedHrTime);

      handler(getCpuUsageInPercent(this.elapsedCpuTime, this.elapsedHrTime));
    }, intervalTicker);
  }

  stopWatcher() {
    clearInterval(this.pid);
  }
}

module.exports = {
  getCpuUsageInPercent,
  hrtimeToMS,
  usageToTotalUsageMS,
  CpuError,
  default: CpuWatcher,
};

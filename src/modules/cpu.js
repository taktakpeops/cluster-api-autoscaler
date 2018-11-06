'use strict';

const os = require('os');

const { Module } = require('./module');

// the INTERVAL_TICKER can be overriden using environment
// example:
//  export INTERVAL_TICKER=500
const { INTERVAL_TICKER = '500' } = process.env;

// nanosecond per second
const NS_TO_MS = 1e6;

class CpuError extends TypeError {}

function hrtimeToMS(hrtime) {
  return (hrtime[0] * 1000.0) + (hrtime[1] / NS_TO_MS);
}

function usageToTotalUsageMS(elapUsage) {
  const elapUserMS = elapUsage.user / 1000.0;
  const elapSystMS = elapUsage.system / 1000.0;

  return elapUserMS + elapSystMS;
}

function getCpuUsageInPercent(startCpuUsage, startHrTime) {
  const elapTimeMS = hrtimeToMS(process.hrtime(startHrTime));
  const elapUsageMS = usageToTotalUsageMS(process.cpuUsage(startCpuUsage));

  return (100.0 * elapUsageMS / elapTimeMS).toFixed(1);
}

function canScaleUp() {
  const avgsCpu = os.loadavg();
  const availbleCpus = os.cpus();

  return avgsCpu.reduceRight((acc, avg) => {
    acc.push(avg < availbleCpus.length - 1);
    return acc;
  }, []).every(x => x);
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
      handler(getCpuUsageInPercent(this.elapsedCpuTime, this.elapsedHrTime));

      this.elapsedCpuTime = process.cpuUsage();
      this.elapsedHrTime = process.hrtime();
    }, intervalTicker);
  }

  stopWatcher() {
    this.pid.unref();
  }
}

module.exports = {
  getCpuUsageInPercent,
  hrtimeToMS,
  usageToTotalUsageMS,
  CpuError,
  canScaleUp,
  default: CpuWatcher,
};

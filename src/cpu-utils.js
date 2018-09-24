'use strict';

function getCpuUsageInPercent(startHrTime, startCpuUsage) {
  const elapTimeMS = hrtimeToMS(process.hrtime(startHrTime));
  const elapUsageMS = usageToTotalUsageMS(process.cpuUsage(startCpuUsage));

  return (100.0 * elapUsageMS / elapTimeMS).toFixed(1);
}

const NS_PER_SEC = 1000000000.0;
const NS_TO_MS = 1000000.0;

function hrtimeToMS(hrtime) {
  const timeInNs = (hrtime[0] * NS_PER_SEC) + hrtime[1];
  return timeInNs / NS_TO_MS;
}

function usageToTotalUsageMS(elapUsage) {
  const elapUserMS = elapUsage.user / 1000.0;
  const elapSystMS = elapUsage.system / 1000.0;

  return elapUserMS + elapSystMS;
}

module.exports = {
  getCpuUsageInPercent,
  hrtimeToMS,
  usageToTotalUsageMS,
};

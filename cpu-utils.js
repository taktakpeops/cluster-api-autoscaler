'use strict';

function getCpuUsageInPercent(startHrTime, startCpuUsage) {
    const elapTimeMS = hrtimeToMS(process.hrtime(startHrTime));
    const elapUsageMS = usageToTotalUsageMS(process.cpuUsage(startCpuUsage));

    return (100.0 * elapUsageMS / elapTimeMS).toFixed(1);
}

function hrtimeToMS(hrtime) {
    return hrtime[0] * 1000.0 + hrtime[1] / 1000000.0;
}

function usageToTotalUsageMS(elapUsage) {
    const elapUserMS = elapUsage.user / 1000.0; // microseconds to milliseconds
    const elapSystMS = elapUsage.system / 1000.0;

    return elapUserMS + elapSystMS;
}

module.exports = {
    getCpuUsageInPercent,
    hrtimeToMS,
    usageToTotalUsageMS,
};

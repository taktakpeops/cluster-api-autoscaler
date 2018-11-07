'use strict';

const cluster = require('cluster');

const { wait, pisNaN } = require('./utils');
const { ActiveWorkersList } = require('./active-workers-list');

if (cluster.isWorker) {
  throw new Error('The auto scaler can be used only in the master');
}

/** @type {ActiveWorkersList} */
let activeWorkers;
/** @type {Number} */
let maxWorkers;
/** @type {Number} */
let minWorkers;

let metricsList = [];

function intializeWorker(worker, metrics) {
  const msn = worker.onNewMetric.bind(worker);
  cluster.workers[worker.name].on('message', msn);

  metrics.forEach(metric => {
    worker.on(`increase-${metric.type}`, async () => {
      if (
        worker.getWorkerRecordsInPercentAvg(metric.type) >= metric.limit &&
        Object.keys(cluster.workers).length < maxWorkers &&
        !activeWorkers.hasWorkerScaled()
      ) {
        worker.hasScaled(5000);
        await scaleUp(1);
      }
    });

    worker.on(`decrease-${metric.type}`, async () => {
      // look into total activities
      const totalWorkers = Object.keys(cluster.workers).length;
      if (
        !activeWorkers.hasHotMetrics(metrics) &&
        totalWorkers > minWorkers &&
        !activeWorkers.hasWorkerScaled()
      ) {
        worker.hasScaled(5000);
        await scaleDown(1);
      }
    });
  });
}

async function scaleUp(amountWorkers = 1) {
  await Promise.all(Array.from({ length: amountWorkers },
    () => new Promise(resolve => {
      const worker = cluster.fork();
      const id = worker.id.toString(10);

      const w = activeWorkers.add(id);
      // consider default warmup of 2000 ms
      intializeWorker(w, metricsList);

      worker.on('online', resolve);
    })
  ));
}

async function scaleDown(amountWorkers = 1) {
  const oldestPid = activeWorkers.lastItem();
  const worker = cluster.workers[oldestPid];

  if (worker && worker.isConnected() && !worker.isDead()) {
    worker.send('shutdown');

    // wait for graceful kill
    await wait(2000);

    worker.kill();
    activeWorkers.removeWorker(oldestPid);
  }

  if (amountWorkers > 1) {
    await scaleDown(amountWorkers - 1);
  }
}

exports.start = async ({
  workerScript,
  metrics,
  customMetricsPath,
  min = 1, // start with one worker
  max = 3,
}) => {
  if (!cluster.isMaster) {
    throw new TypeError('cannot be used from a worker');
  }

  if (!workerScript) {
    throw new TypeError('missing workerScript property in configuration');
  }

  if (pisNaN(min, 10) || pisNaN(max, 10)) {
    throw new TypeError('min and max need to be valid numbers');
  }

  minWorkers = min;
  maxWorkers = max;

  if (!Array.isArray(metrics)) {
    throw new TypeError('metrics need to be defined');
  }

  metricsList = metrics;

  activeWorkers = new ActiveWorkersList(metrics);
  // initial entry
  activeWorkers.add('master', metricsList);

  // setup cluster api
  cluster.setupMaster({
    args: [
      '-f',
      workerScript,
      '-m',
      metrics.map(m => m.type).join(','),
      '-c',
      customMetricsPath || '',
    ],
    exec: `${__dirname}/worker.js`,
  });

  await scaleUp(minWorkers);
};

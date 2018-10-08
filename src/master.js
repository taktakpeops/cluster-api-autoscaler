'use strict';

const cluster = require('cluster');

const { wait, pisNaN } = require('./utils');
const { ActiveWorkersList } = require('./active-workers-list');

if (cluster.isWorker) {
  throw new Error('The auto scaler can be used only in the master');
}

const activeWorkers = new ActiveWorkersList();

let maxWorkers;
let minWorkers;

let metricsList = [];

function getWorkerRecordsInPercentAvg(worker, metricType, limit = 1000) {
  const history = worker.getWorkerHistory(metricType, limit);

  return (history.reduce((acc, v) => {
    acc += v.value;
    return acc;
  }, 0) / history.length * 100);
}

function intializeWorker(worker) {
  const id = worker.id.toString(10);

  activeWorkers.add(id, metricsList);

  const w = activeWorkers.getWorker(id);

  worker.on('message', w.onNewMetric.bind(w));

  metricsList.forEach(metric => {
    w.on(`increase-${metric.type}`, async () => {
      console.log('hello', getWorkerRecordsInPercentAvg(w, metric.type));
      if (getWorkerRecordsInPercentAvg(w, metric.type) >= metric.limit && Object.keys(cluster.workers).length < maxWorkers) {
        await scaleUp(1);
        w.hasScaled();
      }
    });
    w.on(`decrease-${metric.type}`, async () => {
      if (getWorkerRecordsInPercentAvg(w, metric.type) <= metric.limit + 10 && Object.keys(cluster.workers).length >= minWorkers) {
        await scaleDown(1);
        w.hasScaled();
      }
    });
  });
}

async function scaleUp(amountWorkers = 1) {
  await Promise.all(Array.from({ length: amountWorkers },
    () => new Promise(resolve => {
      const worker = cluster.fork();
      intializeWorker(worker);
      worker.on('online', resolve);
    })
  ));
}

async function scaleDown(amountWorkers = 1) {
  const oldestPid = activeWorkers.lastItem();
  const worker = cluster.workers[oldestPid];

  if (worker && worker.isConnected() && !worker.isDead()) {
    // worker.disconnect();

    worker.send('shutdown');

    // wait for graceful kill
    await wait(2000);

    worker.kill();
    activeWorkers.cleanWorker(oldestPid);
  }

  if (amountWorkers > 1) {
    await scaleDown(amountWorkers - 1);
  }
}

exports.start = ({
  workerScript,
  metrics,
  customMetricsPath,
  min, // start with one worker
  max,
}) => {
  if (!cluster.isMaster) {
    throw new TypeError('cannot be used from a worker');
  }

  if (!workerScript) {
    throw new TypeError('missing workerScript property in configuration');
  }

  if (pisNaN(min, 10) || pisNaN(max, 10)) {
    throw new TypeError('min and max need to be defined');
  }

  minWorkers = min;
  maxWorkers = max;

  if (!Array.isArray(metrics)) {
    throw new TypeError('metrics need to be defined');
  }

  metricsList = metrics;

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

  for (let i = 0; i < minWorkers; i++) {
    const worker = cluster.fork();
    intializeWorker(worker);
  }
};

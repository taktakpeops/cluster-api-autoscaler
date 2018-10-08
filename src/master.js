'use strict';

const cluster = require('cluster');

const { wait } = require('./utils');
const { ActiveWorkersList } = require('./active-workers-list');

if (cluster.isWorker) {
  throw new Error('The auto scaler can be used only in the master');
}

const activeWorkers = new ActiveWorkersList();

async function scaleUp(amountWorkers = 1) {
  await Promise.all(Array.from({ length: amountWorkers },
    () => new Promise(resolve => {
      const worker = cluster.fork();

      worker.on('online', resolve);
    })
  ));
}

async function scaleDown(amountWorkers = 1) {
  const oldestPid = activeWorkers.oldest().worker;
  const worker = cluster.workers[oldestPid];

  if (worker && worker.isConnected() && !worker.isDead()) {
    worker.disconnect();

    worker.send('shutdown');

    // wait for graceful kill
    await wait(2000);

    worker.kill();

    activeWorkers.cleanWorker(oldestPid);
    console.log('clean', activeWorkers.oldest());
  }

  if (amountWorkers > 1) {
    await scaleDown(amountWorkers - 1);
  }
}

function getWorkerRecordsInPercent(worker, metricType, limit = 1000) {
  const history = worker.getWorkerHistory(metricType, limit);
  return (history.reduce((acc, v) => {
    acc += v;
    return v;
  }, 0) / history.length * 100);
}

exports.start = (configuration = {
  workerScript: '',
  metrics: [
    {
      type: 'cpu',
      limit: 50, // threshold set 50% of the CPU
    },
    {
      type: 'mem',
      limit: 50, // threshold set 50% of the heap available
    },
  ],
  minWorkers: 1, // start with one worker
  maxWorkers: 8,
}) => {
  if (!cluster.isMaster) {
    throw new TypeError('cannot be used from a worker');
  }

  const metricsConfiguration = configuration.metrics.reduce((acc, val) => acc.push(val) && acc, []);

  // initial entry
  activeWorkers.add('master', metricsConfiguration);

  // setup cluster api
  cluster.setupMaster({
    execArgv: [configuration.workerScript],
    exec: `${__dirname}/worker.js`,
  });

  // create the existing worker
  Object
    .values(cluster.workers)
    .forEach(worker => {
      const id = worker.id.toString(10);

      activeWorkers.add(id, metricsConfiguration);

      const w = activeWorkers.getWorker(id);

      worker.on('message', w.onNewMetric);

      metricsConfiguration.forEach(metric => {
        w.on(`increase-${metric.type}`, async () => {
          if (getWorkerRecordsInPercent(w, metric.type) >= metric.limit) {
            await scaleUp(1);
            w.hasScaled();
          }
        });
        w.on(`decrease-${metric.type}`, async () => {
          if (getWorkerRecordsInPercent(w, metric.type) <= metric.limit + 10) {
            await scaleDown(1);
            w.hasScaled();
          }
        });
      });
    });
};

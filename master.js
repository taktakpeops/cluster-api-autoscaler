'use strict';

const cluster = require('cluster');
const EventEmitter = require('events').EventEmitter;

const { hrtimeToMS, usageToTotalUsageMS } = require('./cpu-utils');
const { wait } = require('./utils');

if (cluster.isWorker) {
    throw new Error('The auto scaler can be used only in the master');
}

const { INTERVAL_TICKER = 1000 } = process.env;

class ActiveWorkersList extends EventEmitter {
    constructor(configuration = [
        {
            type: 'cpu',
            limit: 50, // threshold set 50% of the CPU
        },
        {
            type: 'mem',
            limit: 50, // threshold set 50% of the RAM available
        },
    ]) {
        super();
        this.stack = [];
        this.configuration = configuration;
    }

    add(value) {
        this.stack.push(value);
        
        const history = this.getWorkerHistory(value.worker);
        const items = history.length;

        this.configuration.some((item) => {
            const totals = history.reduce((acc, v) => {
                acc.elapsedCpuTime += v.elapsedCpuTime;
                acc.elapsedHrTime += v.elapsedHrTime
            }, {
                elapsedCpuTime: 0.0,
                elapsedHrTime: 0.0,
            });

            const percent = (100 * totals.elapsedCpuTime / totals.elapsedHrTime).toFixed(1);

            if (percent > item.limit || percent < item.limit - 10) {
                this.emit('new-item', value);
                return true;
            }
            return false;
        });
    }

    last(name) {
        const stack = this.stack.reverse();
        return stack.find(i => i.worker === name);
    }

    oldest() {
        return this.stack.filter(x => x.worker !== 'master').sort((a, b) => a.time - b.time)[0];
    }

    /**
     * Return the entries for a worker
     * @param {string} pid The pid of the worker 
     * @param {Number} limit Optional, define a time limit in milliseconds for the records.
     * @returns The messages for the given period of time
     */
    getWorkerHistory(pid, limit = 10000) {
        const now = Date.now();

        return this.stack
            .filter(x => x.worker === pid)
            .filter(w => w.time >= now - limit);
    }

    getWorkersHistory(limit = 10000, exclude = ['master']) {
        const now = Date.now();

        return this.stack
            .filter(x => exclude.indexOf(x.worker) > -1)
            .filter(w => w.time >= now - limit);
    }

    cleanWorker(pid) {
        this.stack = this.stack.reduce((acc, v) => {
            if (v.worker !== pid) {
                acc.push(v);
            }
            return acc;
        }, []);
    }
}

let elapsedCpuTime = process.cpuUsage();
let elapsedHrTime = process.hrtime();

let activeWorkers;

let cpuTicker;

function stopCpuTicker() {
    cpuTicker();
}

function workerMessageHandler(worker) {
    worker.on('message', (value) => {
        switch (value.type) {
            case 'metrics':
                activeWorkers.add({
                    worker: worker.id,
                    workers: Object.keys(cluster.workers).length,
                    ...value,
                });
                break;
        }
    });
}

async function scaleUp(amountWorkers = 1) {
    return await Promise.all(Array.from({ length: amountWorkers }, 
        () => new Promise(resolve => {
            const worker = cluster.fork();

            workerMessageHandler(worker);

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

    if (amountWorkers > 1) return await scaleDown(amountWorkers - 1);
}

// check each 10 seconds - scaleUp or scaleDown each 10 seconds 
async function cpuAutoScaler(configuration, value, aw) {
    const cpuLimit = parseInt(configuration.metrics.find(metric => metric.type === 'cpu').limit, 10);

    if (!isNaN(cpuLimit) && isFinite(cpuLimit)) {
        const { worker, cpuUsage } = value;

        const history = aw.getWorkersHistory(10000, ['master']);
    
        let items = history.length;

        const avg = Math.round((history.map((h) => {
            if (h.worker === worker) {
                h.cpuUsage = parseFloat(h.cpuUsage) * 2.0; // apply coefficient
                items += 2;
            }
            return h;
        })
        .reduce((acc, v) => acc + parseFloat(v.cpuUsage), 0.0) + parseFloat(cpuUsage)) / items);
        
        console.log(`cpu usage: ${avg}%`);

        if (avg >= cpuLimit && value.workers < configuration.maxWorkers) {
            console.log(`scale up - reason: ${worker}`);
            await scaleUp();
        }

        if (avg < cpuLimit - 10 && value.workers > configuration.minWorkers) {
            console.log(`scale down - reason: ${worker}`);
            await scaleDown();
        }
    }
}

function memAutoScaler(configuration, value) {
    const memLimit = parseInt(configuration.metrics.find(metric => metric.type === 'mem').limit, 10);

    if (isNaN(memLimit) && isFinite(memLimit)) {

    }
}

exports.start = (configuration = {
    metrics: [
        {
            type: 'cpu',
            limit: 50, // threshold set 50% of the CPU
            handler: cpuAutoScaler,
        },
        {
            type: 'mem',
            limit: 50, // threshold set 50% of the RAM available
            handler: memAutoScaler,
        },
    ],
    minWorkers: 1, // start with one worker
    maxWorkers: 8,
}) => {
    activeWorkers = new ActiveWorkersList(configuration.metrics);

    // initial entry
    activeWorkers.add({
        worker: 'master',
        workers: Object.keys(cluster.workers).length,
        elapsedCpuTime: hrtimeToMS(process.hrtime(elapsedCpuTime)),
        elapsedHrTime: usageToTotalUsageMS(process.hrtime(elapsedHrTime)),
        time: Date.now(),
    });


    const metricsHandlers = [
        cpuAutoScaler,
    ];

    cpuTicker = setInterval(() => {
        elapsedCpuTime = process.cpuUsage(elapsedCpuTime);
        elapsedHrTime = process.hrtime(elapsedHrTime);

        activeWorkers.add({
            worker: 'master',
            workers: Object.keys(cluster.workers).length,
            elapsedCpuTime: hrtimeToMS(process.hrtime(elapsedCpuTime)),
            elapsedHrTime: usageToTotalUsageMS(process.hrtime(elapsedHrTime)),
            time: Date.now(),
        });
    }, INTERVAL_TICKER);

    Object.values(cluster.workers).forEach(workerMessageHandler);

    activeWorkers.on('new-item', async (value) => {
        try {
            await Promise
                .all(metricsHandlers.map(f => f(configuration, value, activeWorkers)));
        } catch (err) {
            console.error('unexpected exception - not fatal', err);
        }
    });
}
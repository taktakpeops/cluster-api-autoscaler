'use strict';

const { ActiveWorker } = require('./active-worker');

class ActiveWorkersList {
  constructor(configuration = [{ type: 'cpu' }, { type: 'mem' }]) {
    this.configuration = configuration;

    this.stack = [];
  }

  add(name) {
    const worker = new ActiveWorker(name, this.configuration);

    this.stack.push(worker);
  }

  getWorker(name) {
    return this.stack.find(w => w.name === name);
  }

  removeWorker(name) {
    this.stack = this.stack.reduce((acc, worker) => {
      if (worker.name !== name) {
        acc.push(worker);
      }
      return acc;
    }, []);
  }

  getWarmWorkers(limit = 1000) {
    return this.stack
      .map(w => ({ ...limit, avg: w.getWorkerRecordsInPercentAvg(w.type, limit) }))
      .filter(worker => worker.avg > worker.limit)
      .map(obj => ({ name: obj.name }));
  }

  lastItem() {
    return this.stack[this.stack.length - 1].name;
  }
}

module.exports = {
  ActiveWorkersList,
};

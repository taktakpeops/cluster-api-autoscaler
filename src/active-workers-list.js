'use strict';

const { ActiveWorker } = require('./active-worker');

class ActiveWorkersList {
  constructor() {
    this.stack = [];
  }

  add(name, configuration = [{ type: 'cpu' }, { type: 'mem' }]) {
    const worker = new ActiveWorker(name, configuration);

    this.stack.push(worker);
  }

  getWorker(name) {
    return this.stack.find(w => w.name === name);
  }

  cleanWorker(name) {
    this.stack = this.stack.reduce((acc, worker) => {
      if (worker.name !== name) {
        acc.push(worker);
      }
      return acc;
    }, []);
  }

  lastItem() {
    return this.stack[this.stack.length - 1].name;
  }
}

module.exports = {
  ActiveWorkersList,
};

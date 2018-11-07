'use strict';

const { ActiveWorker } = require('./active-worker');

class ActiveWorkersList {
  constructor(configuration = [
    { type: 'cpu', limit: 50 },
    { type: 'mem', limit: 50 },
  ]) {
    this.configuration = configuration;

    /** @type {Array.<ActiveWorker>} */
    this.stack = [];
  }

  add(name) {
    const worker = new ActiveWorker(name, this.configuration);

    this.stack.push(worker);

    return worker;
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

  /**
   * retrieve the list of workers up the limit for a give metric
   * @param {String} type The type of metric to look into
   * @param {Number} limit Optional, period of time in millisecond to observe.
   * @returns {Array.<ActiveWorker>} returns an array containing the workers being warm
   */
  getHotWorkers(type, limit = 1000) {
    const metric = this.configuration.find(metric => metric.type === type);

    if (!metric) {
      throw new TypeError(`the metric ${type} doesn't exist`);
    }

    return this.stack
      .map(w => ({ ...w, avg: w.getWorkerRecordsInPercentAvg(type, limit) }))
      .filter(worker => worker.avg > metric.limit)
      .map(obj => ({ name: obj.name }));
  }

  hasHotMetrics(metrics) {
    return metrics
      .some(metric => this.stack.some(worker => worker.getWorkerRecordsInPercentAvg(metric.type) >= metric.limit));
  }

  /**
   * @returns {String} The PID of the last worker added
   */
  lastItem() {
    return this.stack[this.stack.length - 1].name;
  }

  /**
   * @returns {Boolean} Says if a worker has already triggered a scale up or a scale down
   */
  hasWorkerScaled() {
    return this.stack.some(x => x.scaled);
  }
}

module.exports = {
  ActiveWorkersList,
};

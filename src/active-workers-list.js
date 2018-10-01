'use strict';

const { EventEmitter } = require('events');
const { ActiveWorker } = require('./active-worker');
const { Module } = require('./modules/module');

class ActiveWorkersList extends EventEmitter {
  constructor() {
    super();
    this.stack = [];
  }

  loadMetrics(config) {
    this.metrics = config.map(conf => {
      if (conf.plugin) {
        const ClassPlugin = require(`${conf.path}/modules/${conf.type}`);
        const m = new ClassPlugin();

        if (m instanceof Module) {
          return {
            type: conf.type,
            module: m,
          };
        }
        throw new TypeError(`Plugin ${conf.type} doesn't match requirements. It doesn't extends the Module class`);
      }
      return require(`./modules/${conf.type}`);
    });
  }

  add(configuration) {
    const worker = new ActiveWorker(configuration);
    this.stack.push(value);

    const history = this.getWorkerHistory(value.worker);

    this.configuration.some(item => {
      const totals = history.reduce((acc, v) => {
        acc.elapsedCpuTime += v.elapsedCpuTime;
        acc.elapsedHrTime += v.elapsedHrTime;
        return acc;
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
   * return the entries for a worker
   * @param {string} pid The pid of the worker
   * @param {Number} limit Optional, define a time limit in milliseconds for the records.
   * @returns {Array} The messages for the given period of time
   */
  getWorkerHistory(pid, limit = 10000) {
    const now = Date.now();

    return this.stack
      .filter(x => x.worker === pid)
      .filter(w => w.time >= now - limit);
  }

  getWorkersHistory(limit = 10000, exclude = [
    'master',
  ]) {
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

module.exports = {
  ActiveWorkersList,
};

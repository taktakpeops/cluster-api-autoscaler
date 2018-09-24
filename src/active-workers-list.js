'use strict';

const { EventEmitter, } = require('events');

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

  _proxyHandler() {
    return {
      set: function (target, property, value) { // eslint-disable-line object-shorthand
        target[property] = value;

        // keep in memory only the last 10 seconds (10 last records per workers)
        const workersHistory = target.reduce((acc, w) => {
          acc[w.worker] = acc[w.worker] ? (acc[w.worker] + 1) : 0;
          return acc;
        }, {});
        Object.keys(workersHistory)
          .filter(x => x > 10);
      },
    };
  }

  add(value) {
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

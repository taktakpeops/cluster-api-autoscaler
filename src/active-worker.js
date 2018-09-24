'use strict';

const { EventEmitter, } = require('events');

class ActiveWorker extends EventEmitter {
  /**
   * create a new worker
   * @param {String} name The name of the worker can be PID
   * @param {Object} config The configuration for the different tresholds
   */
  constructor(name, config = [
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

    if (!name) {
      throw new Error('A name is required for a worker');
    }

    this.name = name;
    this.config = config;
    this.records = [];

    // this.proxyRecords = new
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

  onNewMetric(event) {
    this.records.push({
      ...event,
    });
  }
}

module.exports = {
  ActiveWorker,
};

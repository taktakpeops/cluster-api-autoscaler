'use strict';

const { EventEmitter } = require('events');

class ActiveWorker extends EventEmitter {
  /**
   * create a new worker
   * @param {String} name The name of the worker can be PID
   * @param {Array} config The configuration for the different tresholds
   */
  constructor(name, config = [
    {
      type: 'cpu',
      handler: () => {},
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
  }

  onNewMetric(event) {
    const { type, value, time } = event;

    const conf = this.config.find(x => x.type === type);

    if (conf && !isNaN(conf.limit)) {
      this.emit(`${conf.limit < value ? 'increase' : 'decrease'}-${type}`, { time, value });
      this.records.push({ ...event });
    }
  }

  cleanRecords() {
    this.records.splice(0, this.records.length);
  }
}

module.exports = {
  ActiveWorker,
};

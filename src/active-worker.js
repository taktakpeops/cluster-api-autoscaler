'use strict';

const { EventEmitter } = require('events');

class ActiveWorker extends EventEmitter {
  /**
   * create a new worker
   * @param {String} name The name of the worker can be PID
   * @param {Array} config The configuration for the different tresholds
   */
  constructor(name, config) {
    super();

    if (!name) {
      throw new Error('A name is required for a worker');
    }

    this.name = name;
    this.config = config;
    this.records = [];
    this.scaled = false;
  }

  hasScaled(limit = 1000) {
    this.scaled = true;

    setTimeout(() => {
      this.scaled = false;
      this.cleanRecords();
    }, limit);
  }

  onNewMetric(event) {
    if (this.scaled) {
      return;
    }

    const { type, value, time } = event;

    const conf = this.config.find(x => x.type === type);

    if (conf && !isNaN(conf.limit)) {
      this.emit(`${conf.limit < value ? 'increase' : 'decrease'}-${type}`, { time, value });
      this.records.push({ ...event });
    }
  }

  /**
   * return the entries for a worker
   * @param {String} type the type of metrics
   * @param {Number} limit Optional, define a time limit in milliseconds for the records.
   * @returns {Array} The messages for the given period of time
   */
  getWorkerHistory(type, limit = 1000) {
    const now = Date.now();

    return this.records
      .filter(w => w.type === type && w.time >= now - limit);
  }

  cleanRecords() {
    this.records.splice(0, this.records.length);
  }
}

module.exports = {
  ActiveWorker,
};

'use strict';

const { EventEmitter } = require('events');

/**
 * class used to add all required listeners to a worker
 */
class ActiveWorker extends EventEmitter {
  /**
   * create a new worker
   * @param {String} name The name of the worker can be PID
   * @param {Array} config The configuration for the different tresholds
   */
  constructor(name, config) {
    super();

    if (!name) {
      throw new TypeError('A name is required for a worker');
    }

    if (!config) {
      throw new TypeError('A config is required for the metrics');
    }

    if (!Array.isArray(config)) {
      throw new TypeError('The config needs to be an Array');
    }

    this.name = name;
    this.config = config;
    this.records = [];
    this.scaled = false;
  }

  /**
   * the method set the flag scaled to `true` for `limit` milliseconds
   * the flag is used in order to make sure that we aren't scaling X times for the same worker
   * @param {Number} limit Optional, default 1000ms
   */
  hasScaled(limit = 1000) {
    this.scaled = true;

    setTimeout(() => {
      this.scaled = false;
      this.cleanRecords();
    }, limit);
  }

  /**
   * the handler to set for the `message` event emit by a worker
   * @param {Object} event The event describing the metric provided by a worker
   */
  onNewMetric(event) {
    if (this.scaled) {
      return;
    }

    const { type, value, time } = event;

    const conf = this.config.find(x => x.type === type);

    if (conf && !isNaN(conf.limit)) {
      this.records.push({ ...event });
      this.emit(`${conf.limit < value ? 'increase' : 'decrease'}-${type}`, { time, value });
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

  /**
   * empty the list of records
   */
  cleanRecords() {
    this.records.splice(0, this.records.length);
  }

  /**
   * the method calculate an average value based on the recorded metrics
   * @param {String} metricType The name of the metric
   * @param {Number} limit Optional, the limit in time for the records, 1000ms by default
   * @returns {Number} The average
   */
  getWorkerRecordsInPercentAvg(metricType, limit = 1000) {
    const history = this.getWorkerHistory(metricType, limit);

    if (history.length > 0) {
      const totalItem = history.length;
      const totalSum = history.reduce((acc, v) => {
        acc += v.value;

        return acc;
      }, 0);

      return totalSum / totalItem;
    }

    return 0;
  }
}

module.exports = {
  ActiveWorker,
};

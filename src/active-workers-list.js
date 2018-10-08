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
        const ClassPlugin = require(`${conf.path}/modules/${conf.type}`).default;
        const m = new ClassPlugin();

        if (m instanceof Module) {
          return {
            ...conf,
            module: m,
          };
        }
        throw new TypeError(`Plugin ${conf.type} doesn't match requirements. It doesn't extends the Module class`);
      }
      return { ...conf, module: require(`./modules/${conf.type}`).default };
    });
  }

  add(name, configuration = [{ type: 'cpu' }, { type: 'mem' }]) {
    const config = configuration.reduce((toWatch, metric) => {
      const metricObject = this.metrics.find(m => m.type === metric.type);

      if (metricObject) {
        toWatch.push(metricObject);
      }
      return toWatch;
    }, []);

    const worker = new ActiveWorker(name, config);

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
}

module.exports = {
  ActiveWorkersList,
};

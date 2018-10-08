'use strict';

const cluster = require('cluster');
const fs = require('fs');
const program = require('commander');
const npmPackageJson = require('../package.json');
const { Module } = require('./modules/module');

if (cluster.isMaster) {
  throw new Error('The worker script cannot be run by the cluster master');
}

program
  .version(npmPackageJson.version)
  .option('-f, --file <item>', 'the file to fork', item => {
    try {
      const lstat = fs.lstatSync(item);

      if (lstat.isFile()) {
        return item;
      }
    } catch (error) {
      throw error;
    }
  })
  .option('-m, --metrics [items]', 'a list of metrics, e.g: mem=50,cpu=60', items => items.replace(/([\s]{1,})/g, '').split(',').reduce((acc, constraint) => {
    const metric = constraint.split('=');
    acc.push({ type: metric[0], limit: metric[1] });

    return acc;
  }, []))
  .option('-c, --custom-module-path <path>', 'the path to the custom modules', path => {
    try {
      const lstat = fs.lstatSync(path);

      if (lstat.isDirectory()) {
        return path;
      }
    } catch (error) {
      if (!path) {
        console.warn('no custom module path specified');
        return '';
      }
      throw error;
    }
  })
  .parse(process.argv);

const { file, metrics, customModulePath } = program;

const metricsModules = metrics.map(metric => {
  let ClassPlugin = null;

  if (metric.type === 'cpu' || metric.type === 'mem') {
    ClassPlugin = require(`./modules/${metric.type}`).default;
  } else {
    ClassPlugin = require(`${customModulePath}/${metric.type}`).default;
  }

  const m = new ClassPlugin();

  if (!(m instanceof Module)) {
    throw new TypeError(`Plugin ${metric.type} doesn't match requirements. It doesn't extends the Module class`);
  }

  return { ...metric, module: m };
});

require(file); // eslint-disable-line import/no-unassigned-import

metricsModules.forEach(metric => {
  metric.module.startWatcher(value => process.send({
    type: metric.type,
    value,
    time: Date.now(),
  }));
});

process.on('message', msg => msg === 'shutdown' ? metricsModules.forEach(m => m.module.stopWatcher()) : '');

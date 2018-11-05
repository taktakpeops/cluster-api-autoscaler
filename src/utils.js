'use strict';

const { Module } = require('./modules/module');

const wait = async (delay = 2000) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

const pisNaN = value => isNaN(parseInt(value, 10));

/**
 * load the Node modules for a given list of metrics
 * @param {Array} modules a list of objects describing modules
 * @param {String} customModulePath location of custom metrics
 * @returns {Array} return the list of loaded modules
 */
const loadModules = (modules, customModulePath) => modules.reduce((acc, metric) => {
  try {
    let ClassPlugin = null;

    if (metric.type === 'cpu' || metric.type === 'mem') {
      ClassPlugin = require(`${__dirname}/modules/${metric.type}`).default;
    } else {
      ClassPlugin = require(`${customModulePath}/${metric.type}`).default;
    }

    const m = new ClassPlugin();

    if (!(m instanceof Module)) {
      throw new TypeError(`Plugin ${metric.type} doesn't match requirements. It doesn't extends the Module class`);
    }

    acc.push({ ...metric, module: m });
    return acc;
  } catch (error) {
    throw error;
  }
}, []);

module.exports = {
  wait,
  pisNaN,
  loadModules,
};

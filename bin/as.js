#!/usr/bin/env node

'use strict';

/**
 * cli for the api-autoscaler
 * usage:
 *  Run your program in a single-run:
 *    as run main.js
 *
 *  Run your program forever
 *    as forever main.js
 *    The command `forever` accept a special option `--max-restart <value>`. If not specified, `forever` will restart the cluster until your Ctrl+C.
 *  Options:
 *    - `--min <value>`: minimum amount of workers. Default 1. Can be overriden by defining MIN_WORKERS in your environment.
 *    - `--max <value>`: maximum amount of workers. Default 3. Can be overriden by defining MAX_WORKERS in your environment.
 *    - `-m, --metrics <value>`: the list of metrics to watch. The list items are separated by a comma. An item must follow the format `${type}:${threshold}`.
 *    - `-c, --custom-metrics-path <path>`: in case of custom metrics, specify where to find the modules.
 */

const fs = require('fs');
const program = require('commander');
const as = require('../src/master').start;
const npmPackageJson = require('../package.json');

const minWorkers = parseInt(process.env.MIN_WORKERS, 10) || 1;
const maxWorkers = parseInt(process.env.MAX_WORKERS, 10) || 3;

let defaultConfig = [{
  type: 'cpu',
  limit: 50,
}, {
  type: 'mem',
  limit: 50,
}];

/**
 * set the common options for the commands
 * @param {Object} prog Object of type Command
 * @returns {Object} the Command object
 */
const addOptions = prog => prog
  .option('--min <value>', 'the minimum amount of workers', value => {
    return parseInt(value, 10);
  }, minWorkers)
  .option('--max <value>', 'the maximum amount of workers', value => {
    return parseInt(value, 10);
  }, maxWorkers)
  .option('-m, --metrics <value>', 'comma separated list of metrics with their thresholds. e.g.: cpu:50,mem', value => {
    const metrics = value.split(',');

    defaultConfig = metrics.reduce((acc, element) => {
      const def = element.split(':');

      if (def.length === 2) {
        acc.push({ type: def[0], limit: def[1] });
      }

      return acc;
    }, []);
  }, defaultConfig)
  .option('-c, --custom-metrics-path <path>', 'the path to the custom modules', path => {
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
  });

program
  .version(npmPackageJson.version);

const startAutoScaler = args => as({
  ...args,
});

const start = program
  .command('start <file>');

addOptions(start)
  .action((file, cmd) => {
    startAutoScaler({
      workerScript: file,
      ...cmd,
    })
      .catch(error => {
        console.error('something went wrong', error);
        process.exit(1);
      });
  });

async function * retryAutoscaler({ retries, conf }) {
  try {
    yield * await startAutoScaler(conf);
  } catch (error) {
    yield Promise.resolve(retries--);
  }
}

const forever = program
  .command('forever <file>');

addOptions(forever)
  .option('--max-restart <value>', 'the maximum amount of restarts. Default, undefined.', value => parseInt(value, 10), -1)
  .action(async (file, cmd) => {
    const { maxRestart: retries = -1, ...rest } = cmd;

    const generator = retryAutoscaler({
      retries,
      conf: {
        workerScript: file,
        ...rest,
      },
    });

    const recurs = r => generator.next({
      retries: r,
      conf: {
        workerScript: file,
        ...rest,
      },
    })
      .catch(error => {
        if (error instanceof Error || error === 0) {
          throw error;
        }
        recurs(error);
      });

    await recurs(retries);
  });

program
  .parse(process.argv);

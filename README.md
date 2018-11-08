# cluster-api-autoscaler

[![Build Status](https://travis-ci.org/jackTheRipper/cluster-api-autoscaler.svg?branch=master)](https://travis-ci.org/jackTheRipper/cluster-api-autoscaler)

This projecf is an experiment around the NodeJS Cluster API.

The goal is to bring a solution allowing a hybrid usage. you can either instantiate the autoscaler in your code or use it as a cli.

The motivation behind it is related to the usage of NodeJS and its Cluster API in Kubernetes. Instead of defining a static amount of workers, the module takes care of increasing or decreasing the amount of workers based on CPU usage and memory available for each of them.

Such as the Horizontal Pod Autoscaler of Kubernetes, the module aims to provide a support for custom metrics. The custom metrics could be, as an example, amount of incoming requests for an Express server.

## Usage

The autoscaler supports two usage - CLI and programmatic usage.

### CLI

2 commands are available.

- `start`: run the program in a single run mode.
  - usage: `as start <file> [options]`
  - options:
    - `--min`: specify the minimum amount of workers. Default value: 2.
    - `--max`: specify the maximum amount of workers. Default value: 4.
    - `-m, --metrics`: specify the metrics to collect and to observe. Default value: "cpu:50,mem:50".
    - `-c, --custom-metrics-path`: specify the path for custom modules.
- `forever`: run a program undefinitely or X times before dying.
  - usage: `as forever <file> [options]`
  - options:
    - `--max-restart`: specify a maximum amount of restart. If not defined, `forever` re-tries indefinitely.
    - `--min`: specify the minimum amount of workers. Default value: 2.
    - `--max`: specify the maximum amount of workers. Default value: 4.
    - `-m, --metrics`: specify the metrics to collect and to observe. Default value: "cpu:50,mem:50".
    - `-c, --custom-metrics-path`: specify the path for custom modules.

### Programmatic approach

In your master module implement the following code:

```javascript
'use strict';

const as = require('cluster-api-autoscaler').start;

as({
  workerScript: `${__dirname}/worker.js`,
  metrics: [
    {
      type: 'cpu',
      limit: 50,
    },
    {
      type: 'mem',
      limit: 50,
    },
  ],
  min: 1,
  max: 5,
}).catch(error => {
  console.error('something went wrong', error);
  process.exit(1);
});
```

Then run the following command in your terminal:

```bash
$> node master.js
```

## ToDo

- improve documentation
- improve test coverage
- implement graceful shutdown in example
- provide example custom metrics
- provide charts mono-process vs as (maybe Locust)

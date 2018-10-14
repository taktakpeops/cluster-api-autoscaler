# cluster-api-autoscaler

This projecf is an experiment around the NodeJS Cluster API.

The goal is to bring a solution allowing a hybrid usage. you can either instantiate the autoscaler in your code or use it as a cli.

The motivation behind it is related to the usage of NodeJS and its Cluster API in Kubernetes. Instead of defining a static amount of workers, the module takes care of increasing or decreasing the amount of workers based on CPU usage and memory available for each of them.

Such as the Horizontal Pod Autoscaler of Kubernetes, the module aims to provide a support for custom metrics. The custom metrics could be, as an example, amount of incoming requests for an Express server.

## Usage

For now, the CLI is not available.

An example of implementation can be found in the examples folder.

The code has been tested with the current LTS of NodeJS (8.X) on Mac OS. It will most probably not work on Windows.

## ToDo

- a lot of things
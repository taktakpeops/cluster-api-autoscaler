'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
    const as = require('./master.js').start;

    const worker = cluster.fork();

    // worker.on('message', (data) => {
    //     console.log(data);
    // });
    as();
} else {
    require('./worker');
    // setTimeout(() => test.unref(), 2500);
    // setInterval(() => {
        console.log('hello');
        const time = Date.now();
        while (Date.now() < time + 1000);
    // }, 1000);
}
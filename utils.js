'use strict';

async function wait(delay = 2000) {
    return await new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = {
    wait,
};

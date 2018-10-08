'use strict';

const wait = async (delay = 2000) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

const pisNaN = value => isNaN(parseInt(value, 10));

module.exports = {
  wait,
  pisNaN,
};

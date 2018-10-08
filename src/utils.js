'use strict';

const wait = async (delay = 2000) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

module.exports = {
  wait,
};

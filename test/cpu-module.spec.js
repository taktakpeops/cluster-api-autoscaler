'use strict';

const assert = require('assert');
const sinon = require('sinon');

const {
  getCpuUsageInPercent,
} = require('../src/modules/cpu');

describe('test cpu-utils.js', () => {
  /** @type sinon.SinonSandbox */
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return 50% of CPU usage', () => {
    sandbox.stub(process, 'hrtime').returns([
      3,
      3000000000,
    ]);
    sandbox.stub(process, 'cpuUsage').returns({
      user: 1000000,
      system: 2000000,
    });

    assert.strictEqual(getCpuUsageInPercent(), 50.0);
  });
});

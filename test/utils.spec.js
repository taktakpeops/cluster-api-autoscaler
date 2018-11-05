'use strict';

const assert = require('assert');

const { loadModules } = require('../src/utils');
const { Module } = require('../src/modules/module');

describe('test utils', () => {
  it('loadModules: do its job', () => {
    const modules = loadModules([
      {
        type: 'cpu',
      },
      {
        type: 'mem',
      },
    ]);

    assert.strictEqual(2, modules.length);
    assert.strictEqual(modules[0].module instanceof Module, true);
  });

  it('loadModules: fails in case the loaded class is not extending Module', () => {
    assert.throws(() => loadModules([
      {
        type: 'bad-module',
      },
    ], './test/mocks'), 'Plugin bad-module doesn\'t match requirements. It doesn\'t extends the Module class');
  });
});

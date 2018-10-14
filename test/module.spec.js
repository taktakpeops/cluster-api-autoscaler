'use strict';

const assert = require('assert');

const {
  Module,
  ModuleError,
} = require('../src/modules/module');

describe('test Module abstract class', () => {
  it('the class cannot be directly instanciated', () => {
    assert.throws(() => new Module(), 'this is an abstract class');
  });

  it('an extended class must implement startWatcher and stopWatcher', () => {
    class TestClass extends Module {}

    assert.throws(() => new TestClass(), 'the class hasn\'t a method called `startWatcher`');
  });

  it('does not throw errors if `startWatcher` and `stopWatcher` are implemented', () => {
    class TestClass extends Module {
      startWatcher() {}

      stopWatcher() {}
    }

    assert.doesNotThrow(() => new TestClass(), ModuleError);
  });
});

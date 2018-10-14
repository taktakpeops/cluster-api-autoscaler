'use strict';

const { EventEmitter } = require('events');

class ModuleError extends TypeError {}

class Module extends EventEmitter {
  constructor() {
    if (new.target === Module) {
      throw new ModuleError('this is an abstract class');
    }

    super();

    if (!this.startWatcher) {
      throw new ModuleError('the class hasn\'t a method called `startWatcher`');
    }

    if (!this.stopWatcher) {
      throw new ModuleError('the class hasn\'t a method called `startWatcher`');
    }
  }
}

module.exports = {
  Module,
  ModuleError,
};

'use strict';

class ModuleError extends TypeError {}

class Module {
  constructor() {
    if (new.target === Module) {
      throw new ModuleError('this is an abstract class');
    }

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

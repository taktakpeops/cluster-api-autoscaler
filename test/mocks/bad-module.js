'use strict';

class SomeModule {
  hasLuck() {
    return (Math.random() * 10) % 2 > 1;
  }
}

module.exports = {
  default: SomeModule,
};

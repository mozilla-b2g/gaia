/* global Process */

'use strict';

/***/
(function(exports) {
  var Stream = function(configs) {
    this.configs = {
      events: configs.events || [],
      interrupts: configs.interrupts || [],
      handler: configs.handler || (() => {})
    };
  };

  Stream.prototype.status = function() {
    return this.process.status;
  };

  Stream.prototype.start = function() {
    this.process = new Process();
    this.process.start();
    return this;
  };

  Stream.prototype.ready = function() {
    this.configs.events.forEach((ename) => {
      window.addEventListener(ename, this);
    });
    this.configs.interrupts.forEach((iname) => {
      window.addEventListener(iname, this);
    });
    return this;
  };

  Stream.prototype.stop = function() {
    this.process.stop();
    this.configs.events.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
    this.configs.interrupts.forEach((iname) => {
      window.removeEventListener(iname, this);
    });
    return this;
  };

  Stream.prototype.destroy = function() {
    this.process.destroy();
    return this;
  };

  Stream.prototype.next = function(step) {
    this.process.next(step);
    return this;
  };

  Stream.prototype.rescue = function(rescuer) {
    this.process.rescue(rescuer);
    return this;
  };

  /**
   * Only when all tasks passed in get resolved,
   * the process would go to the next.
   */
  Stream.prototype.wait = function(tasks) {
    this.process.wait(tasks);
    return this;
  };

  Stream.prototype.handleEvent = function(evt) {
    if ('start' !== this.process.states.phase) {
      return this;
    }
    if (-1 !== this.configs.interrupts.indexOf(evt.type)) {
      // Interrupt would be handled immediately.
      this.configs.handler(evt);
      return this;
    } else {
      // Event would be handled after queuing.
      // This is, if the event handle return a Promise or Process,
      // that can be fulfilled later.
      this.process.next(() => {
        return this.configs.handler(evt);
      });
      return this;
    }
  };

  exports.Stream = Stream;
})(window);


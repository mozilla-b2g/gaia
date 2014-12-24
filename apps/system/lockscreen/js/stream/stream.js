/* global Source, Process */

'use strict';

/***/
(function(exports) {
  var Stream = function(configs) {
    this.configs = {
      events: configs.events || [],
      interrupts: configs.interrupts || []
    };
    if (configs.sources) {
      this.configs.sources = configs.sources;
    } else {
      this.configs.sources = [
        Source.events(this.configs.events.concat(
          this.configs.interrupts))
      ];
    }
    this.states = {
      forwardTo: null
    };
    // Need to delegate to Source.
    this.handleEvent = this.handleEvent.bind(this);
  };

  Stream.prototype.phase = function() {
    return this.process.states.phase;
  };

  Stream.prototype.start = function(forwardTo) {
    this.states.forwardTo = forwardTo;
    this.process = new Process();
    this.process.start();
    return this;
  };

  Stream.prototype.ready = function() {
    this.configs.sources.forEach((source) => {
      source.start(this.handleEvent);
    });
    return this;
  };

  Stream.prototype.stop = function() {
    this.process.stop();
    this.configs.sources.forEach((source) => {
      source.stop();
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
   * Return a Promise get resolved when the stream turn to
   * the specific phase. For example:
   *
   *    stream.until('stop')
   *          .then(() => { console.log('stream stopped') });
   *    stream.start();
   */
  Stream.prototype.until = function(phase) {
    return this.process.until(phase);
  };

  /**
   * Only when all tasks passed in get resolved,
   * the process would go to the next.
   */
  Stream.prototype.wait = function(tasks) {
    this.process.wait(tasks);
    return this;
  };

  /**
   * It would receive events from Source, and than queue or not queue
   * it, depends on whether the event is an interrupt.
   */
  Stream.prototype.handleEvent = function(evt) {
    if ('start' !== this.process.states.phase) {
      return this;
    }
    if (-1 !== this.configs.interrupts.indexOf(evt.type)) {
      // Interrupt would be handled immediately.
      this.states.forwardTo(evt);
      return this;
    } else {
      // Event would be handled after queuing.
      // This is, if the event handle return a Promise or Process,
      // that can be fulfilled later.
      this.process.next(() => {
        return this.states.forwardTo(evt);
      });
      return this;
    }
  };

  exports.Stream = Stream;
})(window);


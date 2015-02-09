/* global Process */

'use strict';

/**
 * Combine the abilities of the event handling and asynchronous operations
 * sequentializing together. So that every Stream could:
 *
 * 1. For the ordinary events, append steps to the main Process to queue
 *    the event handlers.
 * 2. For other urgent events (interrupts), immediately execute the event
 *    handler without queuing it.
 * 3. Only receive events when it's 'ready'. Before that, no source events
 *    would be forwarded and handled.
 * 4. Once phase becomes 'stop', no events would be received again.
 **/
(function(exports) {
  var Stream = function(configs = {}) {
    this.configs = {
      events: configs.events || [],
      interrupts: configs.interrupts || []
    };
    if (configs.sources && 0 !== configs.sources.length) {
      this.configs.sources = configs.sources;
    } else {
      this.configs.sources = [];
    }
    this._forwardTo = null;
    // Need to delegate to Source.
    this.onchange = this.onchange.bind(this);
  };

  Stream.prototype.phase = function() {
    return this.process.states.phase;
  };

  Stream.prototype.start = function(forwardTo) {
    this._forwardTo = forwardTo;
    this.process = new Process();
    this.process.start();
    return this;
  };

  /**
   * Kick off Source and start do things.
   */
  Stream.prototype.ready = function() {
    this.configs.sources.forEach((source) => {
      source.start(this.onchange);
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
  Stream.prototype.onchange = function(evt) {
    if ('start' !== this.process.states.phase) {
      return this;
    }
    if (-1 !== this.configs.interrupts.indexOf(evt.type)) {
      // Interrupt would be handled immediately.
      this._forwardTo(evt);
      return this;
    } else {
      // Event would be handled after queuing.
      // This is, if the event handle return a Promise or Process,
      // that can be fulfilled later.
      this.process.next(() => {
        return this._forwardTo(evt);
      });
      return this;
    }
  };

  exports.Stream = Stream;
})(window);


 'use strict';

/**
 * Stream would take care about whether event should be handled
 * according to the process status. If it's stopped, then all queued
 * events would not be handled anymore.
 *
 * If we have other input sources should be handled by Stream,
 * using adapter to forward as events, rather to extend Stream
 * to accept multiple kinds of sources. Since this would add extra
 * complexities.
 */
(function(exports) {
  var Stream = function() {
    this.inames = [];
    this.enames = [];
    // Need to bind it since it's not handleEvent method.
    this.handleInterrupt = this.handleInterrupt.bind(this);
  };

  /**
   * It receives a Process instance from the handler component to avoid
   * multiple process sync issues between Stream and the handler.
   */
  Stream.prototype.start = function(process) {
    this.process = process;
    return this;
  };

  Stream.prototype.events = function(enames) {
    this.enames = enames;
    return this;
  };

  /**
   * Some events have high priority that shouldn't be queued,
   * but interrupt the queueing.
   */
  Stream.prototype.interrupts = function(inames) {
    this.inames = inames;
    return this;
  };

  Stream.prototype.handler = function(handler) {
    this.handler = handler;
    return this;
  };

  /**
   * Only when it's ready it would start to listen events and
   * handle them. Please note if call ready before the handler
   * can handle events properly, errors may occur. This depends
   * on how much preparations need to be done before we can
   * handle the events.
   */
  Stream.prototype.ready = function() {
    this.inames.forEach((ename) => {
      window.addEventListener(ename, this.handleInterrupts);
    });
    this.enames.forEach((ename) => {
      window.addEventListener(ename, this);
    });
  };

  /**
   * Queue each incoming event and it's handler with the process.
   * This would make sure all preparation to handle these events
   * can be done before it's ready to handle them.
   *
   * And in this way, if the process get stopped, since we hook handlers
   * on the 'start' phase, the queue-ed steps would not be executed anymore,
   * since the phase would get interrupted.
   */
  Stream.prototype.handleEvent = function(evt) {
    if ('started' === this.process.status.phase) {
      // We assume the handler's this has been bind,
      // so we only need to bind the event as arguments.
      this.process.then(this.handler.bind({}, evt));
    }
  };

  /**
   * The only difference between events and interrupts is
   * we would not queue interrupts. Since they're with higher
   * properity.
   */
  Stream.prototype.handleInterrupt = function(evt) {
    if ('started' === this.process.status.phase) {
      this.handler(evt);
    }
  };

  Stream.prototype.stop = function() {
    this.inames.foEach((iname) => {
      window.removeEventListener(iname, this.handleInterrupts);
    });
    this.enames.foEach((ename) => {
      window.removeEventListener(ename, this);
    });
  };
  exports.Stream = Stream;
})(window);


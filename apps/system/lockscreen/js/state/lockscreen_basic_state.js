/* global Stream */
'use strict';

(function(exports) {
  var LockScreenBasicState = function(component) {
    // A lock to prevent transferring racing. This is because most of source
    // events are mapped into interrupts to trigger transferrings. To prevent
    // client need to implement this again and again we put the lock here.
    this._transferred = false;
    // Replace with the name of concrete state.
    this.configs = {
      name: 'LockScreenBasicState',
      // Note the event means events forwarded from sources, not DOM events.
      stream: {
        events: [],
        interrupts: [],
        sources: []
      }
    };
    // Component reference proivdes every resource & property
    // need by all states.
    this.component = component;
  };

  /**
   * Stream' phase is the state's phase.
   */
  LockScreenBasicState.prototype.phase =
  function() {
    return this.stream.phase();
  };

  /**
   * Derived states should extend these basic methods.
   */
  LockScreenBasicState.prototype.start =
  function() {
    this.stream = new Stream(this.configs.stream);
    return this.stream.start(this.handleSourceEvent.bind(this))
      .next(this.stream.ready.bind(this.stream));
  };

  LockScreenBasicState.prototype.stop = function() {
    return this.stream.stop();
  };

  LockScreenBasicState.prototype.destroy = function() {
    return this.stream.destroy();
  };

  LockScreenBasicState.prototype.live = function() {
    return this.stream.until('stop');
  };

  LockScreenBasicState.prototype.exist = function() {
    return this.stream.until('destroy');
  };

  /**
   * Must transfer to next state via component's method.
   * Or the component cannot track the last active state.
   */
  LockScreenBasicState.prototype.transferTo = function() {
    if (this._transferred) {
      this.logger.debug('Prevent transferring racing');
      var nullifized = new Stream();
      // This would return a process could be concated but would do nothing.
      // It's better to formally provide a API from Process, like
      // Process.maybe() or Process#nullize(), but this is a simplier solution.
      return nullifized.start().next(() => nullifized.stop());
    }
    // No need to reset it again since a state instance should not be
    // transferred to twice.
    this._transferred = true;
    return this.component.transferTo.apply(this.component, arguments);
  };

  /**
   * If this handler return a Promise, or Process, the underlying Stream
   * can make sure the steps are queued even with asynchronous steps.
   */
  LockScreenBasicState.prototype.handleSourceEvent = function() {};

  exports.LockScreenBasicState = LockScreenBasicState;
})(window);


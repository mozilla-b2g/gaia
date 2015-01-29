/* global SourceEvent */
'use strict';

/**
 * A source fire events every clock minutes.
 **/
(function(exports) {
  var MinuteClockSource = function(configs) {
    this.configs = {
      type: configs.type,
      interval: 60000       // one minute.
    };
    this._id = null;
    this._forwardTo = null;
    // Some API you just can't bind it with the object,
    // but a function.
    this.onchange = this.onchange.bind(this);
  };

  MinuteClockSource.prototype.start = function(forwardTo) {
    this._forwardTo = forwardTo;
    var seconds = (new Date()).getSeconds();
    // If it's at the second 0th of the minute, immediate start to tick.
    var leftMilliseconds = (0 === seconds) ? 0 : (60 - seconds) * 1000;
    window.setTimeout(() => {
      this.onchange();    // When it's up to the 0 sec of the new minute.
      this._id = window.setInterval(() => {
        this.onchange();
      }, this.configs.interval);
    }, leftMilliseconds);
    return this;
  };

  MinuteClockSource.prototype.stop = function() {
    this._forwardTo = null;
    if (this._id) {
      window.clearInterval(this._id);
    }
    return this;
  };

  /**
   * For forwarding to the target.
   * When the time is up, fire an event by generator.
   * So that the onchange method would forward it to the target.
   */
  MinuteClockSource.prototype.onchange = function() {
    if (this._forwardTo) {
      this._forwardTo(new SourceEvent(this.configs.type));
    }
  };

  exports.MinuteClockSource = MinuteClockSource;
})(window);


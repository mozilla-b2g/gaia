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
    this._tickId = null;
    this._forwardTo = null;
    // Some API you just can't bind it with the object,
    // but a function.
    this.onchange = this.onchange.bind(this);
  };

  MinuteClockSource.prototype.start = function(forwardTo) {
    this._forwardTo = forwardTo;
    var seconds = (new Date()).getSeconds();
    // If it's the #0 second of that minute,
    // immediately tick or we would lost this minute.
    if (0 === seconds) {
      this.onchange();
    }
    // For the first tick we must set timeout for it.
    this._tickId = window.setTimeout(() => {
      this.tick();
    }, this.calcLeftMilliseconds());
    return this;
  };

  MinuteClockSource.prototype.tick = function() {
    this.onchange();
    // For the first tick we must set timeout for it.
    this._tickId = window.setTimeout(() => {
      this.tick();
    }, this.calcLeftMilliseconds());
  };

  MinuteClockSource.prototype.stop = function() {
    this._forwardTo = null;
    if (this._tickId) {
      window.clearTimeout(this._tickId);
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

  MinuteClockSource.prototype.calcLeftMilliseconds = function() {
    var seconds = (new Date()).getSeconds();
    // If it's at the second 0th of the minute, immediate start to tick.
    var leftMilliseconds = (60 - seconds) * 1000;
    return leftMilliseconds;
  };

  exports.MinuteClockSource = MinuteClockSource;
})(window);


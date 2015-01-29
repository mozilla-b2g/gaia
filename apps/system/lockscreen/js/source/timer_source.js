/* global SourceEvent */
'use strict';

/**
 * Event source for Stream. One Stream can collect events from multiple
 * sources, which pass different native events (not only DOM events)
 * to Stream.
 **/
(function(exports) {
  var TimerSource = function(configs) {
    this.configs = {
      // The name of SourceEvent we would fire.
      type: configs.type,
      // In ms. Just like setTimeout/setInterval.
      // Default is equal to setTimeout with 0 ms.
      interval: configs.interval || 0,
      // If no times, it's equal to setInterval (never ends).
      times: configs.times
    };
    this._id =
    this._counter =
    this._forwardTo = null;
    // Some API you just can't bind it with the object,
    // but a function.
    this.onchange = this.onchange.bind(this);
  };

  TimerSource.prototype.start = function(forwardTo) {
    this._forwardTo = forwardTo;
    this._counter = this.configs.times;
    this._id = window.setInterval(() => {
      if ('undefined' === typeof this.configs.times) {
        this.onchange();
      } else if ('undefined' !== typeof this.configs.times &&
                 0 === this._counter) {
        window.clearInterval(this._id);
      } else if ('undefined' !== typeof this.configs.times &&
                 null !== this._counter &&
                 0 !== this._counter) {
        this.onchange();
        this._counter --;
      }
    }, this.configs.interval);
    return this;
  };

  TimerSource.prototype.stop = function() {
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
  TimerSource.prototype.onchange = function() {
    if (this._forwardTo) {
      this._forwardTo(new SourceEvent(this.configs.type));
    }
  };

  exports.TimerSource = TimerSource;
})(window);


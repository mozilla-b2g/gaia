 'use strict';

/**
 * Event source for Stream. One Stream can collect events from multiple
 * sources, which pass different native events (not only DOM events)
 * to Stream.
 **/
(function(exports) {
  var SettingSource = function(configs) {
    this.configs = {
      settings: configs.settings || []
    };
    this._collector = navigator.mozSettings.addObserver;
    this._decollector = navigator.mozSettings.removeObserver;
    this._forwardTo = null;
    // Some API you just can't bind it with the object,
    // but a function.
    this.onchange = this.onchange.bind(this);
  };

  SettingSource.prototype.start = function(forwardTo) {
    this.configs.events.forEach((ename) => {
      this._collector(ename, this.onchange);
    });
    this._forwardTo = forwardTo;
    return this;
  };

  SettingSource.prototype.stop = function() {
    this._forwardTo = null;
    this.configs.events.forEach((ename) => {
      this._decollector(ename, this.onchange);
    });
    return this;
  };

  /**
   * For forwarding to the target.
   */
  SettingSource.prototype.onchange = function(evt) {
    if (this._forwardTo) {
      this._forwardTo(evt);
    }
  };

  exports.SettingSource = SettingSource;
})(window);


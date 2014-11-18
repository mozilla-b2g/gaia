/* global SourceEvent */
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
    this.configs.settings.forEach((key) => {
      this._collector(key, this.onchange);
    });
    this._forwardTo = forwardTo;
    return this;
  };

  SettingSource.prototype.stop = function() {
    this._forwardTo = null;
    this.configs.settings.forEach((key) => {
      this._decollector(key, this.onchange);
    });
    return this;
  };

  /**
   * For forwarding to the target.
   * Would transform the original 'settingName' and 'settingValue' pair as
   * 'type' and 'detail', as the event formant.
   */
  SettingSource.prototype.onchange = function(change) {
    if (this._forwardTo) {
      this._forwardTo(
        new SourceEvent(change.settingName, change.settingValue));
    }
  };

  exports.SettingSource = SettingSource;
})(window);


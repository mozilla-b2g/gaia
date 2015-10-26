/**
 * Shim for navigator.mozHour12 API.
 * Send `localechanged` event if mozHour12 is changed.
 *
 * App need include following permission in manifest:
 *
 * "settings":{ "access": "readonly" }
 */
(function(){
  'use strict';
  // not polyfill if API already exists
  if (window.navigator.mozHour12 || window.navigator.hour12) {return;}

  // mock mozHour12 onto window.navigator
  window.navigator.mozHour12 = undefined;

  // set hour12 and emit the locale change event if value changed
  var _setMozHour12 = function(result) {
    if (result === null) {
      // locale.hour12 may be true, false, `undefined` or `null`.
      // We can't write to mozSettings with `undefined`, but we want to cast
      // null to be undefined because then we can easily assign
      // Intl hour12: navigator.mozHour12 which is a paradigm we want to use.
      //
      // if you set hour12 to undefined it uses automatic value, but it doesn't
      // work if you set it to `null`, so we cast here to `undefined`.
      result = undefined;
    }
    if (window.navigator.mozHour12 !== result) {
      window.navigator.mozHour12 = result;
      // emit the locale change event
      window.dispatchEvent(new CustomEvent('timeformatchange'));
    }
  };

  // handler observer event
  var _hour12Handler = function(event) {
    _setMozHour12(event.settingValue);
  };

  var _kLocaleTime = 'locale.hour12';
  // update mozHour12 to real value
  var req = window.navigator.mozSettings.createLock().get(_kLocaleTime);
  req.onsuccess = function() {
    _setMozHour12(req.result[_kLocaleTime]);
  };
  // monitor settings changes
  window.navigator.mozSettings.addObserver(_kLocaleTime, _hour12Handler);
})();

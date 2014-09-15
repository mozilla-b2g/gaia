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
  window.navigator.mozHour12 = null;

  // set hour12 and emit the locale change event if value changed
  var _setMozHour12 = function(result) {
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

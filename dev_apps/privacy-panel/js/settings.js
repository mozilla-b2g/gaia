'use strict';

var RING_ENABLED = 'rpp.ring.enabled';
var LOCK_ENABLED = 'rpp.lock.enabled';
var LOCATE_ENABLED = 'rpp.locate.enabled';
var WIPE_ENABLED = 'rpp.wipe.enabled';
var UNLOCK_ENABLED = 'rpp.unlock.enabled';
var PASSWORD = 'rpp.password';
var RESET_REQUIRED = 'rpp.reset.required';
var GEO_RADIUS = 'geolocation.blur.radius';
var GEO_COORDS = 'geolocation.blur.coords';

var Settings = {

  _lock : null,

  _init : function () {
    var settings = navigator.mozSettings;
    if (settings) {
      this._lock = settings.createLock();
      if (this._lock) {
        this._createParam(RING_ENABLED, false);
        this._createParam(LOCK_ENABLED, false);
        this._createParam(LOCATE_ENABLED, false);
        this._createParam(WIPE_ENABLED, false);
        this._createParam(UNLOCK_ENABLED, false);
        this._createParam(PASSWORD, '');
        this._createParam(RESET_REQUIRED, false);
        this._createParam(GEO_RADIUS, 1);
        this._createParam(GEO_COORDS, '');

        this._checkResetRequired();
      }
    }
  },

  _createParam : function (name, value) {
    var self = this;
    var req = this._lock.get(name);
    req.onsuccess = function () {
      if (typeof req.result[name] === 'undefined') {

        var param = {};
        param[name] = value;
        self._lock.set(param);
      }
    };
    req.onerror = function () {};
  },

  _checkResetRequired : function () {
    var self = this;
    var req = this._lock.get(RESET_REQUIRED);
    req.onsuccess = function () {
      var resetRequired = false;

      var value = req.result[RESET_REQUIRED];
      if (typeof value === 'boolean') {
        resetRequired = value;
      } else if (typeof value === 'string') {
        resetRequired = (value === 'true');
      }

      if (resetRequired) {

        var param = {};
        param[PASSWORD] = '';
        param[RESET_REQUIRED] = false;
        self._lock.set(param);
      }
    };
    req.onerror = function () {};
  }

};

navigator.mozL10n.once(Settings._init.bind(Settings));

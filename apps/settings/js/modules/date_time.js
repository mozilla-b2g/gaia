/**
 * DateTime is a singleton that caches date, time, timezone values for
 * Date & Time panel fast access
 *
 * @module DateTime
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var settings = window.navigator.mozSettings;

  // keys
  var _kClockAutoEnabled = 'time.clock.automatic-update.enabled';
  var _kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';
  var _kClockAutoAvailable = 'time.clock.automatic-update.available';
  var _kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';
  var _kTimezone = 'time.timezone';
  var _kUserSelected = 'time.timezone.user-selected';
  var _kLocaleTime = 'locale.hour12';

  // handler
  var _updateDateTimeout = null;
  var _updateTimeTimeout = null;

  var DateTime = Module.create(function DateTime() {
    this.super(Observable).call(this);
    this._init();
  }).extend(Observable);


  // public observers
  /**
   * Auto setting Date & Time.
   *
   * @access public
   * @memberOf DateTime
   * @type {Boolean}
   */
  Observable.defineObservableProperty(DateTime.prototype, 'clockAutoEnabled', {
    readonly: true,
    value: true
  });

  /**
   * SIM provide Auto clock function.
   *
   * @access public
   * @memberOf DateTime
   * @type {Boolean}
   */
  Observable.defineObservableProperty(DateTime.prototype,
    'clockAutoAvailable', {
      readonly: true,
      value: true
  });

  /**
   * SIM provide Auto timezone function.
   *
   * @access public
   * @memberOf DateTime
   * @type {Boolean}
   */
  Observable.defineObservableProperty(DateTime.prototype,
    'timezoneAutoAvailable', {
      readonly: true,
      value: true
  });

  /**
   * Current Timezone.
   *
   * @access public
   * @memberOf DateTime
   * @type {String}
   */
  Observable.defineObservableProperty(DateTime.prototype, 'timezone', {
    readonly: true,
    value: ''
  });

  /**
   * User Selected Timezone.
   *
   * @access public
   * @memberOf DateTime
   * @type {String}
   */
  Observable.defineObservableProperty(DateTime.prototype,
    'userSelectedTimezone', {
      readonly: true,
      value: ''
  });

  /**
   * Current Date string.
   *
   * @access public
   * @memberOf DateTime
   * @type {String}
   */
  Observable.defineObservableProperty(DateTime.prototype, 'date', {
    readonly: true,
    value: ''
  });

  /**
   * Localized current time string.
   *
   * @access public
   * @memberOf DateTime
   * @type {String}
   */
  Observable.defineObservableProperty(DateTime.prototype, 'time', {
    readonly: true,
    value: ''
  });

  /**
   * Current AM/PM or 24 state.
   *
   * @access public
   * @memberOf DateTime
   * @type {Boolean}
   */
  Observable.defineObservableProperty(DateTime.prototype, 'currentHour12', {
    readonly: true,
    value: true
  });

  /**
   * Init DateTime module.
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._init = function() {
    this._mozTime = window.navigator.mozTime;
    if (!this._mozTime) {
      console.error('Could not get window.navigator.mozTime');
      return;
    }

    this._boundSetTimeAutoEnabled = function(event) {
      this._clockAutoEnabled = event.settingValue;
      // also set timezoneAutoEnabled
      this._setTimezoneAutoEnabled(event.settingValue);
    }.bind(this);
    this._boundSetClockAutoAvailable = function(event) {
      this._clockAutoAvailable = event.settingValue;
    }.bind(this);
    this._boundSetTimezoneAutoAvailable = function(event) {
      this._timezoneAutoAvailable = event.settingValue;
    }.bind(this);
    this._boundSetTimezone = function(event) {
      this._timezone = event.settingValue;
    }.bind(this);
    this._boundUserSelectedTimezone = function(event) {
      this._userSelectedTimezone = event.settingValue;
    }.bind(this);
    this._boundCurrentHour12 = function(event) {
      this._currentHour12 = event.settingValue;

      this._autoUpdateDateTime();
    }.bind(this);

    this._getDefaults();
    this._attachListeners();
  };

  DateTime.prototype._attachListeners = function() {
    window.navigator.mozSettings.addObserver(_kClockAutoEnabled,
      this._boundSetTimeAutoEnabled);
    window.navigator.mozSettings.addObserver(_kClockAutoAvailable,
      this._boundSetClockAutoAvailable);
    window.navigator.mozSettings.addObserver(_kTimezoneAutoAvailable,
      this._boundSetTimezoneAutoAvailable);
    window.navigator.mozSettings.addObserver(_kTimezone,
      this._boundSetTimezone);
    window.navigator.mozSettings.addObserver(_kUserSelected,
      this._boundUserSelectedTimezone);
    window.navigator.mozSettings.addObserver(_kLocaleTime,
      this._boundCurrentHour12);
    // Listen to 'localized' to get the latest l10n resource.
    window.addEventListener('localized', this);
    // Listen to 'moztimechange' to update clock
    window.addEventListener('moztimechange', this);
  };

  DateTime.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'moztimechange':
        navigator.mozL10n.ready((function _updateTime() {
          this._autoUpdateDateTime();
        }).bind(this));
        break;
      case 'localized':
        var d = new Date();
        // update time format while language changed
        this._updateTimeFormat();
        this._date = this._formatDate(d);
        this._time = this._formatTime(d);
        break;
    }
  };

  /**
   * fill in default values to public observers
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._getDefaults = function() {
    SettingsCache.getSettings(function(results) {
      this._clockAutoEnabled = results[_kClockAutoEnabled];
      this._clockAutoAvailable = results[_kClockAutoAvailable];
      this._timezoneAutoAvailable = results[_kTimezoneAutoAvailable];
      this._timezone = results[_kTimezone];
      this._userSelectedTimezone = results[_kUserSelected];
      this._currentHour12 = results[_kLocaleTime];
      // render date/time after get proper format
      this._autoUpdateDateTime();
    }.bind(this));
  };

  /**
   * Auto update date and time
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._autoUpdateDateTime = function() {
    window.clearTimeout(_updateDateTimeout);
    window.clearTimeout(_updateTimeTimeout);
    this._autoUpdateDate();
    this._autoUpdateTime();
  };

  /**
   * Update Date periodically.
   *
   * DONT call this function directly,
   * call _autoUpdateDateTime instead.
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._autoUpdateDate = function() {
    var d = new Date();
    this._date = this._formatDate(d);

    var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
      d.getMinutes() * 60 * 1000 - d.getMilliseconds();
    _updateDateTimeout = window.setTimeout(
      function updateDateTimeout() {
        this._autoUpdateDate();
      }.bind(this), remainMillisecond);
  };

  /**
   * Update Time periodically.
   *
   * DONT call this function directly,
   * call _autoUpdateDateTime instead.
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._autoUpdateTime = function() {
    var d = new Date();
    this._time = this._formatTime(d);

    var remainMillisecond = (59 - d.getSeconds()) * 1000;
    _updateTimeTimeout = window.setTimeout(
      function updateTimeTimeout() {
        this._autoUpdateTime();
      }.bind(this), remainMillisecond);
  };

  /**
   * Return preffered date format.
   *
   * @access private
   * @memberOf DateTime
   * @param {Date|String} input could be Date or String
   * @param {Boolean} iso force output as YYYY-MM-DD for ISO 8601 text parsing
   * @returns {String}
   */
  DateTime.prototype._formatDate = function(d, iso) {
    var _ = navigator.mozL10n.get;
    if (d instanceof Date) {
      if (iso) {
        return d.toLocaleFormat('%Y-%m-%d');
      } else {
        var f = new navigator.mozL10n.DateTimeFormat();
        return f.localeFormat(d, _('shortDateFormat'));
      }
    } else {
      return d;
    }
  };

  /**
   * Return preffered time format.
   *
   * @access private
   * @memberOf DateTime
   * @param {Date|String} input could be Date or String
   * @param {Boolean} iso force output as HH:MM for ISO 8601 text parsing
   * @returns {String}
   */
  DateTime.prototype._formatTime = function(d, iso) {
    var _ = navigator.mozL10n.get;
    if (d instanceof Date) {
      var format;
      if (iso) {
        format = '%H:%M';
        return d.toLocaleFormat(format);
      } else {
        var f = new navigator.mozL10n.DateTimeFormat();
        format = (this._currentHour12 === true) ?
           _('shortTimeFormat12') : _('shortTimeFormat24');
        return f.localeFormat(d, format);
      }
    } else {
      if (d.indexOf(':') == 1) {  // Format: 8:05 --> 08:05
        d = '0' + d;
      }
      return d;
    }
  };

  /**
   * Change system time
   *
   * @access public
   * @memberOf DateTime
   */
  DateTime.prototype.setTime = function(type, value) {
    var pDate = '';
    var pTime = '';
    var d = new Date();
    switch (type) {
      case 'date':
        // Get value from date picker.
        pDate = this._formatDate(value);  // Format: 2012-09-01
        pTime = this._formatTime(d, true);
        break;

      case 'time':
        // Get value from time picker.
        pDate = this._formatDate(d, true);
        pTime = this._formatTime(value);  // Format: 0:02, 8:05, 23:45
        break;
    }
    // Construct a Date object with date time
    // specified in a ISO 8601 string (YYYY-MM-DDTHH:MM)
    var newDate = new Date(pDate + 'T' + pTime);
    this._mozTime.set(newDate);
  };

  /**
   * Change TimezoneAutoEnabled settings.
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._setTimezoneAutoEnabled = function(enabled) {
    var cset = {};
    cset[_kTimezoneAutoEnabled] = enabled;
    settings.createLock().set(cset);
  },

  /**
   * Change UserSelectedTimezone settings.
   *
   * @access public
   * @memberOf DateTime
   */
  DateTime.prototype.setUserSelectedTimezone = function(selected) {
    var cset = {};
    cset[_kTimezone] = selected;
    settings.createLock().set(cset);
  };

  /**
   * Change hour12 settings.
   * this valie is used to determine 12 or 24 time format.
   *
   * @access public
   * @memberOf DateTime
   */
  DateTime.prototype.setCurrentHour12 = function(selected) {
    var cset = {};
    cset[_kLocaleTime] = selected;
    settings.createLock().set(cset);
  };

  /**
   * If language changed (in FTU or settings),
   * set hour12 based on language locale properties.
   *
   * @access private
   * @memberOf DateTime
   */
  DateTime.prototype._updateTimeFormat = function() {
    var _ = navigator.mozL10n.get;
    var localeTimeFormat = _('shortTimeFormat');
    var is12hFormat = (localeTimeFormat.indexOf('%I') >= 0);
    this.setCurrentHour12(is12hFormat);
  };

  return DateTime();
});

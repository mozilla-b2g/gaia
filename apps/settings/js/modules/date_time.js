/**
 * DateTime is a singleton that caches date, time, timezone values for
 * Date & Time panel fast access
 *
 * @module DateTime
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var Observable = require('modules/mvvm/observable');
  var settings = window.navigator.mozSettings;

  // keys
  var _kClockAutoEnabled = 'time.clock.automatic-update.enabled';
  var _kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';
  var _kClockAutoAvailable = 'time.clock.automatic-update.available';
  var _kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';
  var _kTimezone = 'time.timezone';
  var _kUserSelected = 'time.timezone.user-selected';

  // handler
  var _updateDateTimeout = null;
  var _updateTimeTimeout = null;

  var dateTimePrototype = {
    // public observers
    /**
     * Auto setting Date & Time.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {Boolean}
     */
    clockAutoEnabled: true,

    /**
     * SIM provide Auto clock function.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {Boolean}
     */
    clockAutoAvailable: true,

    /**
     * SIM provide Auto timezone function.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {Boolean}
     */
    timezoneAutoAvailable: true,

    /**
     * Current Timezone.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {String}
     */
    timezone: '',

    /**
     * User Selected Timezone.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {String}
     */
    userSelectedTimezone: '',

    /**
     * Current Date string.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {String}
     */
    date: '',

    /**
     * Localized current time string.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {String}
     */
    time: '',

    /**
     * Init DateTime module.
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _init: function dt_init() {
      this._mozTime = window.navigator.mozTime;
      if (!this._mozTime) {
        console.error('Could not get window.navigator.mozTime');
        return;
      }

      this._boundSetTimeAutoEnabled = function(event) {
        this.clockAutoEnabled = event.settingValue;
        // also set timezoneAutoEnabled
        this._setTimezoneAutoEnabled(event.settingValue);
      }.bind(this);
      this._boundSetClockAutoAvailable = function(event) {
        this.clockAutoAvailable = event.settingValue;
      }.bind(this);
      this._boundSetTimezoneAutoAvailable = function(event) {
        this.timezoneAutoAvailable = event.settingValue;
      }.bind(this);
      this._boundSetTimezone = function(event) {
        this.timezone = event.settingValue;
      }.bind(this);
      this._boundUserSelectedTimezone = function(event) {
        this.userSelectedTimezone = event.settingValue;
      }.bind(this);

      this._getDefaults();
      this._attachListeners();
    },

    _attachListeners: function dt_attachListeners() {
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
      // Listen to 'moztimechange'
      window.addEventListener('moztimechange', this);
    },

    handleEvent: function dt_handleEvent(evt) {
      switch (evt.type) {
        case 'moztimechange':
          navigator.mozL10n.ready((function _updateTime() {
            this._autoUpdateDateTime();
          }).bind(this));
        break;
      }
    },

    /**
     * fill in default values to public observers
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _getDefaults: function dt_getDefaults() {
      this._autoUpdateDateTime();

      SettingsCache.getSettings(function(results) {
        this.clockAutoEnabled = results[_kClockAutoEnabled];
        this.clockAutoAvailable = results[_kClockAutoAvailable];
        this.timezoneAutoAvailable = results[_kTimezoneAutoAvailable];
        this.timezone = results[_kTimezone];
        this.userSelectedTimezone = results[_kUserSelected];
      }.bind(this));
    },

    /**
     * Auto update date and time
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _autoUpdateDateTime: function dt_autoUpdateDateTime() {
      window.clearTimeout(_updateDateTimeout);
      window.clearTimeout(_updateTimeTimeout);
      this._autoUpdateDate();
      this._autoUpdateTime();
    },

    /**
     * Update Date periodically
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _autoUpdateDate: function dt_autoUpdateDate() {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      this.date = f.localeFormat(d, '%x');

      var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
        d.getMinutes() * 60 * 1000 - d.getMilliseconds();
      _updateDateTimeout = window.setTimeout(
        function updateDateTimeout() {
          this._autoUpdateDate();
        }.bind(this), remainMillisecond);
    },

    /**
     * Update Time periodically
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _autoUpdateTime: function dt_autoUpdateTime() {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      var format = _('shortTimeFormat');
      this.time = f.localeFormat(d, format);

      var remainMillisecond = (59 - d.getSeconds()) * 1000;
      _updateTimeTimeout = window.setTimeout(
        function updateTimeTimeout() {
          this._autoUpdateTime();
        }.bind(this), remainMillisecond);
    },

    /**
     * Return preffered date format.
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _formatDate: function dt_formatDate(d) {
      if (d instanceof Date) {
        return d.toLocaleFormat('%Y-%m-%d');
      } else {
        return d;
      }
    },

    /**
     * Return preffered time format.
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _formatTime: function dt_formatTime(d) {
      if (d instanceof Date) {
        return d.toLocaleFormat('%H:%M');
      } else {
        if (d.indexOf(':') == 1) {  // Format: 8:05 --> 08:05
          d = '0' + d;
        }
        return d;
      }
    },

    /**
     * Change system time
     *
     * @access public
     * @memberOf dateTimePrototype
     */
    setTime: function dt_setTime(type, value) {
      var pDate = '';
      var pTime = '';
      var d = new Date();
      switch (type) {
        case 'date':
          // Get value from date picker.
          pDate = this._formatDate(value);  // Format: 2012-09-01
          pTime = this._formatTime(d);
          break;

        case 'time':
          // Get value from time picker.
          pDate = this._formatDate(d);
          pTime = this._formatTime(value);  // Format: 0:02, 8:05, 23:45
          break;
      }
      // Construct a Date object with date time
      // specified in a ISO 8601 string (YYYY-MM-DDTHH:MM)
      var newDate = new Date(pDate + 'T' + pTime);
      this._mozTime.set(newDate);
    },

    /**
     * Change TimezoneAutoEnabled settings.
     *
     * @access private
     * @memberOf dateTimePrototype
     */
    _setTimezoneAutoEnabled: function dt_setTimezoneAutoEnabled(enabled) {
      var cset = {};
      cset[_kTimezoneAutoEnabled] = enabled;
      settings.createLock().set(cset);
    },

    /**
     * Change UserSelectedTimezone settings.
     *
     * @access public
     * @memberOf dateTimePrototype
     */
    setUserSelectedTimezone: function dt_setUserSelectedTimezone(selected) {
      var cset = {};
      cset[_kTimezone] = selected;
      settings.createLock().set(cset);
    }
  };

  // Create the observable object using the prototype.
  // return singleton
  var instance = Observable(dateTimePrototype);
  instance._init();
  return instance;
});

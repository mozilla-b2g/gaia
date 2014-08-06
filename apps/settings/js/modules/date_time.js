/**
 * DateTime is a singleton that caches date, time, timezone values for
 * Date & Time panel fast access
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var SettingsListener = require('shared/settings_listener');
  var Observable = require('modules/mvvm/observable');
  var settings = window.navigator.mozSettings;

  // keys
  var _kClockAutoEnabled = 'time.clock.automatic-update.enabled';
  var _kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';
  var _kClockAutoAvailable = 'time.clock.automatic-update.available';
  var _kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';
  var _kTimezone = 'time.timezone';
  var _kUserSelected = 'time.timezone.user-selected';
  var _updateDateTimeout = null;
  var _updateClockTimeout = null;

  var dateTimePrototype = {
    // public observers
    clockAutoEnabled: true,
    clockAutoAvailable: true,
    timezoneAutoAvailable: true,
    timezone: '',
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
     * Localized current clock string.
     *
     * @access public
     * @memberOf dateTimePrototype
     * @type {String}
     */
    clock: '',
    enabled: false,
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

      this._boundSetTimeAutoEnabled = function(value) {
        this.clockAutoEnabled = value;
      }.bind(this);
      this._boundSetClockAutoAvailable = function(value) {
        this.clockAutoAvailable = value;
      }.bind(this);
      this._boundSetTimezoneAutoAvailable = function(value) {
        this.timezoneAutoAvailable = value;
      }.bind(this);
      this._boundSetTimezone = function(value) {
        this.timezone = value;
      }.bind(this);
      this._boundUserSelectedTimezone = function(value) {
        this.userSelectedTimezone = value;
      }.bind(this);
      this.boundSetEnabled = function(value) {
        this._setEnabled(value);
      }.bind(this);

      this._getDefaults();
      this._attachListeners();
    },

    _attachListeners: function dt_attachListeners() {
      SettingsListener.observe(_kClockAutoEnabled, true,
        this._boundSetTimeAutoEnabled);
      SettingsListener.observe(_kClockAutoAvailable, true,
        this._boundSetClockAutoAvailable);
      SettingsListener.observe(_kTimezoneAutoAvailable, true,
        this._boundSetTimezoneAutoAvailable);
      SettingsListener.observe(_kTimezone, 'America/New_York',
        this._boundSetTimezone);
      SettingsListener.observe(_kUserSelected, '',
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
     */
    _autoUpdateDateTime: function dt_autoUpdateDateTime() {
      window.clearTimeout(_updateDateTimeout);
      window.clearTimeout(_updateClockTimeout);
      this._autoUpdateDate();
      this._autoUpdateClock();
    },
    /**
     * Update Date periodically
     *
     * @access public
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
     * @access public
     * @memberOf dateTimePrototype
     */
    _autoUpdateClock: function dt_autoUpdateClock() {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      var format = _('shortTimeFormat');
      this.clock = f.localeFormat(d, format);

      var remainMillisecond = (59 - d.getSeconds()) * 1000;
      _updateClockTimeout = window.setTimeout(
        function updateClockTimeout() {
          this._autoUpdateClock();
        }.bind(this), remainMillisecond);
    },

    formatDate: function dt_formatDate(d) {
      if (d instanceof Date) {
        return d.toLocaleFormat('%Y-%m-%d');
      } else {
        return d;
      }
    },

    formatTime: function dt_formatTime(d) {
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
     */
    setTime: function dt_setTime(type, value) {
      var pDate = '';
      var pTime = '';
      var d = new Date();
      switch (type) {
        case 'date':
          // Get value from date picker.
          pDate = this.formatDate(value);  // Format: 2012-09-01
          pTime = this.formatTime(d);
          break;

        case 'time':
          // Get value from time picker.
          pDate = this.formatDate(d);
          pTime = this.formatTime(value);  // Format: 0:02, 8:05, 23:45
          break;
      }
      // Construct a Date object with date time
      // specified in a ISO 8601 string (YYYY-MM-DDTHH:MM)
      var newDate = new Date(pDate + 'T' + pTime);
      this._mozTime.set(newDate);
    },
    /**
     * Hide automatic time setting if no source available.
     */
    setTimeAutoAvailable: function dt_setTimeAutoAvailable() {
      // disable the time auto-update if N/A
      if (!(this.clockAutoAvailable || this.timezoneAutoAvailable)) {
        var cset = {};
        cset[_kClockAutoEnabled] = false;
        cset[_kTimezoneAutoEnabled] = false;
        settings.createLock().set(cset);
      }
    },
    setClockAutoAvailable: function dt_setClockAutoAvailable() {
      this.setTimeAutoAvailable();
    },
    setTimezoneAutoAvailable: function dt_setTimezoneAutoAvailable() {
      this.setTimeAutoAvailable();
    },
    setTimezoneAutoEnabled: function dt_setTimezoneAutoEnabled(enabled) {
      var cset = {};
      cset[_kTimezoneAutoEnabled] = enabled;
      settings.createLock().set(cset);
    },
    setUserSelectedTimezone: function dt_setUserSelectedTimezone(selected) {
      settings.createLock().set({_kTimezone: selected});
    }
  };

  // Create the observable object using the prototype.
  // return singleton
  var instance = Observable(dateTimePrototype);
  instance._init();
  return instance;
});

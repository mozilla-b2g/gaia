/**
 * Handle Date and Time panel functionality
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var SettingsListener = require('shared/settings_listener');
  var tzSelect = require('shared/tz_select');

  var settings = window.navigator.mozSettings;

  var DateTime = function() {
    this._elements = {};
    this._mozTime = null;
    // keys
    this._kClockAutoEnabled = 'time.clock.automatic-update.enabled';
    this._kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';
    this._kClockAutoAvailable = 'time.clock.automatic-update.available';
    this._kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';
    this._kTimezone = 'time.timezone';

    this._timeAutoEnabled = false;
    this._clockAutoAvailable = false;
    this._timezoneAutoAvailable = false;
    this._updateDateTimeout = null;
    this._updateClockTimeout = null;
    // user last time selection
    this._userSelTimezone = null;
  };

  DateTime.prototype = {
    init: function dt_init(elements) {
      this._elements = elements;

      this._mozTime = window.navigator.mozTime;
      if (!this._mozTime) {
        console.error('Could not get window.navigator.mozTime');
        return;
      }

      SettingsCache.getSettings(function(results) {
        this._userSelTimezone = results['time.timezone.user-selected'];

        this.setTimeAutoEnabled(results[this._kClockAutoEnabled]);
        this.setClockAutoAvailable(!!results[this._kClockAutoAvailable]);
        this.setTimezoneAutoAvailable(!!results[this._kTimezoneAutoAvailable]);
        this.updateTimezone(results[this._kTimezone]);
      }.bind(this));

      this.updateDate();
      this.updateClock();

      // monitor time.timezone changes, see /shared/js/tz_select.js
      var noOp = function() {};
      tzSelect(this._elements.timezoneRegion, this._elements.timezoneCity,
        noOp, noOp);

      this.bundleSetTimeAutoEnabled = function(event) {
        this.setTimeAutoEnabled(!!event.settingValue);
      }.bind(this);

      this.bundleSetClockAutoAvailable = function(event) {
        this.setClockAutoAvailable(!!event.settingValue);
      }.bind(this);

      this.bundleSetTimezoneAutoAvailable = function(event) {
        this.setTimezoneAutoAvailable(!!event.settingValue);
      }.bind(this);

      this.bundleUpdateTimezone = function(event) {
        this.updateTimezone(event.settingValue);
      }.bind(this);
    },

    attachListeners: function as_attachListeners() {
      SettingsListener.observe(this._kClockAutoEnabled, false,
        this.bundleSetTimeAutoEnabled);
      SettingsListener.observe(this._kClockAutoAvailable, false,
        this.bundleSetClockAutoAvailable);
      SettingsListener.observe(this._kTimezoneAutoAvailable, false,
        this.bundleSetTimezoneAutoAvailable);
      SettingsListener.observe(this._kTimezone, false,
        this.bundleUpdateTimezone);

      this._elements.datePicker.addEventListener('input',
        this.datePickerChange);
      this._elements.timePicker.addEventListener('input',
        this.timePickerChange);

      window.addEventListener('moztimechange', this);
      window.addEventListener('localized', this);
      document.addEventListener('visibilitychange', this);
    },

    detachListeners: function as_detachListeners() {
      SettingsListener.unobserve(this._kClockAutoEnabled,
        this.bundleSetTimeAutoEnabled);
      SettingsListener.unobserve(this._kClockAutoAvailable,
        this.bundleSetClockAutoAvailable);
      SettingsListener.unobserve(this._kTimezoneAutoAvailable,
        this.bundleSetTimezoneAutoAvailable);
      SettingsListener.unobserve(this._kTimezone, this.bundleUpdateTimezone);

      this._elements.datePicker.removeEventListener('input',
        this.datePickerChange);
      this._elements.timePicker.removeEventListener('input',
        this.timePickerChange);

      window.removeEventListener('moztimechange', this);
      window.removeEventListener('localized', this);
      document.removeEventListener('visibilitychange', this);
    },

    /**
     * Change system time
     */
    setTime: function dt_setTime(type) {
      var pDate = '';
      var pTime = '';
      var d = new Date();
      switch (type) {
        case 'date':
          // Get value from date picker.
          pDate = this._elements.datePicker.value;  // Format: 2012-09-01
          pTime = d.toLocaleFormat('%H:%M');
          break;

        case 'time':
          // Get value from time picker.
          pDate = d.toLocaleFormat('%Y-%m-%d');
          pTime = this._elements.timePicker.value;  // Format: 0:02, 8:05, 23:45
          break;
      }
      if (pTime.indexOf(':') == 1) {  // Format: 8:05 --> 08:05
        pTime = '0' + pTime;
      }
      // Construct a Date object with date time
      // specified in a ISO 8601 string (YYYY-MM-DDTHH:MM)
      var newDate = new Date(pDate + 'T' + pTime);
      this._mozTime.set(newDate);
    },

    /**
     * Monitor time.clock.automatic-update.enabled changes.
     * Also sync to time.timezone.automatic-update.enabled.
     */
    setTimeAutoEnabled: function dt_setTimeAutoEnabled(enabled) {
      this._timeAutoEnabled = enabled;
      this._elements.timeAutoSwitch.dataset.state = enabled ? 'auto' : 'manual';
      this._elements.timezoneRaw.hidden =
        !(this._timezoneAutoAvailable && this._timeAutoEnabled);

      var cset = {};
      cset[this._kTimezoneAutoEnabled] = enabled;
      settings.createLock().set(cset);

      this.updateUI();
      if (this._timeAutoEnabled) {
        return;
      }

      // Reset the timezone to the previous user selected value
      if (this._userSelTimezone) {
        settings.createLock().set({'time.timezone': this._userSelTimezone});
      }
    },

    /**
     * Hide automatic time setting if no source available.
     */
    setTimeAutoAvailable: function dt_setTimeAutoAvailable(available) {
      this._elements.timeAutoSwitch.hidden = !available;
      if (!available) { // disable the time auto-update if N/A
        var cset = {};
        cset[this._kClockAutoEnabled] = false;
        cset[this._kTimezoneAutoEnabled] = false;
        settings.createLock().set(cset);
      }
    },

    setClockAutoAvailable: function dt_setClockAutoAvailable(available) {
      this._clockAutoAvailable = available;
      this.setTimeAutoAvailable(this._clockAutoAvailable ||
        this._timezoneAutoAvailable);
    },

    setTimezoneAutoAvailable: function dt_setTimezoneAutoAvailable(available) {
      var needUpdateUI = (this._timezoneAutoAvailable != available);
      this._timezoneAutoAvailable = available;
      this.setTimeAutoAvailable(this._clockAutoAvailable ||
        this._timezoneAutoAvailable);
      if (needUpdateUI) {
        this.updateUI();
      }
    },

    updateUI: function dt_updateUI() {
      this._elements.datePicker.disabled = this._timeAutoEnabled;
      this._elements.timePicker.disabled = this._timeAutoEnabled;
      this._elements.timezoneRegion.disabled =
        (this._timezoneAutoAvailable && this._timeAutoEnabled);
      this._elements.timezoneCity.disabled =
        (this._timezoneAutoAvailable && this._timeAutoEnabled);
      this._elements.timezoneRaw.hidden =
        !(this._timezoneAutoAvailable && this._timeAutoEnabled);

      if (this._timeAutoEnabled) {
        this._elements.timeManual.classList.add('disabled');
        if (this._timezoneAutoAvailable) {
          this._elements.timezone.classList.add('disabled');
        }
      } else {
        this._elements.timeManual.classList.remove('disabled');
        this._elements.timezone.classList.remove('disabled');
      }
    },

    updateTimezone: function dt_updateTimezone(timezone) {
      this._elements.timezoneValue.textContent = timezone;
    },

    updateDate: function dt_updateDate() {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      this._elements.clockDate.textContent = f.localeFormat(d, '%x');

      var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
                              d.getMinutes() * 60 * 1000 -
                              d.getMilliseconds();
      var self = this;
      this._updateDateTimeout = window.setTimeout(function updateDateTimeout() {
        self.updateDate();
      }, remainMillisecond);
    },

    updateClock: function dt_updateClock() {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      var format = _('shortTimeFormat');
      this._elements.clockTime.textContent = f.localeFormat(d, format);

      var self = this;
      this._updateClockTimeout =
        window.setTimeout(function updateClockTimeout() {
        self.updateClock();
      }, (59 - d.getSeconds()) * 1000);
    },

    datePickerChange: function dt_datePickerChange() {
      this.setTime('date');
      // Clean up the value of picker once we get date set by the user.
      // It will get new date according system time when pop out again.
      this._elements.datePicker.value = '';
    },

    timePickerChange: function dt_timePickerChange() {
      this.setTime('time');
      // Clean up the value of picker once we get time set by the user.
      // It will get new time according system time when pop out again.
      this._elements.timePicker.value = '';
    },

    handleEvent: function dt_handleEvent(evt) {
      switch (evt.type) {
        case 'moztimechange':
          this._timechange();
          break;
        case 'localized':
          this._localized();
          break;
        case 'visibilitychange':
          this._visibilityChange();
          break;
      }
    },

    _moztimechange: function dt_moztimechange() {
      window.clearTimeout(this._updateDateTimeout);
      window.clearTimeout(this._updateClockTimeout);
      this.updateDate();
      this.updateClock();
    },

    /**
     * Update date and time locale when language is changed
     */
    _localized: function dt_localized() {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      var format = _('shortTimeFormat');
      this._elements.clockDate.textContent = f.localeFormat(d, '%x');
      this._elements.clockTime.textContent = f.localeFormat(d, format);
    },

    _visibilityChange: function dt_visibilityChange() {
      if (!document.hidden) {
        this.updateDate();
        this.updateClock();
      } else {
        window.clearTimeout(this._updateDateTimeout);
        window.clearTimeout(this._updateClockTimeout);
      }
    }
  };

  return function ctor_dateTime() {
    return new DateTime();
  };
});
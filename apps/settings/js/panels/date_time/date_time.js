/* global tzSelect */
/**
 * Handle Date and Time panel functionality
 */
define(function(require) {
  'use strict';

  var settings = window.navigator.mozSettings;
  var _ = navigator.mozL10n.get;

  var DateTime = function() {
    this._elements = {};
    this._mozTime = null;

    this.kClockAutoEnabled = 'time.clock.automatic-update.enabled';
    this.kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';
    this._clockAutoAvailable = false;
    this._timezoneAutoAvailable = false;
    this._updateDateTimeout = null;
    this._updateClockTimeout = null;
    this._timeAutoEnabled = false;
  };

  DateTime.prototype = {
    init: function dt_init(elements) {
      this._elements = elements;

      this._mozTime = window.navigator.mozTime;
      if (!this._mozTime) {
        console.error('Could not get window.navigator.mozTime');
        return;
      }

      var self = this;
      settings.addObserver(this.kClockAutoEnabled, function(event) {
        self.setTimeAutoEnabled(!!event.settingValue);
      });

      var reqClockAutoEnabled =
        settings.createLock().get(this.kClockAutoEnabled);
      reqClockAutoEnabled.onsuccess = function clock_getStatusSuccess() {
        self.setTimeAutoEnabled(
          reqClockAutoEnabled.result[self.kClockAutoEnabled]);
      };

      /**
       * Hide automatic time setting if no source available.
       */
      var kClockAutoAvailable = 'time.clock.automatic-update.available';
      var kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';

      settings.addObserver(kClockAutoAvailable, function(event) {
        self.setClockAutoAvailable(!!event.settingValue);
      });

      settings.addObserver(kTimezoneAutoAvailable, function(event) {
        self.setTimezoneAutoAvailable(!!event.settingValue);
      });

      var reqClockAutoAvailable =
        settings.createLock().get(kClockAutoAvailable);
      reqClockAutoAvailable.onsuccess = function clock_getStatusSuccess() {
        self.setClockAutoAvailable(
          !!reqClockAutoAvailable.result[kClockAutoAvailable]);
      };

      var reqTimezoneAutoAvailable =
        settings.createLock().get(kTimezoneAutoAvailable);
      reqTimezoneAutoAvailable.onsuccess =
        function timezone_getStatusSuccess() {
        self.setTimezoneAutoAvailable(
          !!reqTimezoneAutoAvailable.result[kTimezoneAutoAvailable]);
      };

      settings.addObserver('time.timezone', function(event) {
        self.updateTimezone(event.settingValue);
      });

      var reqTimezone = settings.createLock().get('time.timezone');
      reqTimezone.onsuccess = function timezone_getStatusSuccess() {
        self.updateTimezone(reqTimezone.result['time.timezone']);
      };

      this.updateDate();
      this.updateClock();

      // monitor time.timezone changes, see /shared/js/tz_select.js
      var noOp = function() {};
      tzSelect(this._elements.timezoneRegion,
        this._elements.timezoneCity, noOp, noOp);

      this._elements.datePicker.addEventListener('input',
        function datePickerChange() {
        this.setTime('date');
        // Clean up the value of picker once we get date set by the user.
        // It will get new date according system time when pop out again.
        self._elements.datePicker.value = '';
      });

      this._elements.timePicker.addEventListener('input',
        function timePickerChange() {
        this.setTime('time');
        // Clean up the value of picker once we get time set by the user.
        // It will get new time according system time when pop out again.
        self._elements.timePicker.value = '';
      });

      window.addEventListener('moztimechange', this);
      window.addEventListener('localized', this);
      document.addEventListener('visibilitychange', this);
    },

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
      this._elements.timeZone.hidden =
        !(this._timezoneAutoAvailable && this._timeAutoEnabled);

      var cset = {};
      cset[this.kTimezoneAutoEnabled] = enabled;
      settings.createLock().set(cset);

      this.updateUI();
      if (this._timeAutoEnabled) {
        return;
      }

      // Reset the timezone to the previous user selected value
      var reqUserTZ = settings.createLock().get('time.timezone.user-selected');
      reqUserTZ.onsuccess = function dt_getUserTimezoneSuccess() {
        var userSelTimezone = reqUserTZ.result['time.timezone.user-selected'];
        if (userSelTimezone) {
          settings.createLock().set({'time.timezone': userSelTimezone});
        }
      };
    },

    setTimeAutoAvailable: function dt_setTimeAutoAvailable(available) {
      this._elements.timeAutoSwitch.hidden = !available;
      if (!available) { // disable the time auto-update if N/A
        var cset = {};
        cset[this.kClockAutoEnabled] = false;
        cset[this.kTimezoneAutoEnabled] = false;
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
      this._elements.timeZone.hidden =
        !(this._timezoneAutoAvailable && this._timeAutoEnabled);

      if (this._timeAutoEnabled) {
        document.getElementById('time-manual').classList.add('disabled');
        if (this._timezoneAutoAvailable) {
          document.getElementById('timezone').classList.add('disabled');
        }
      } else {
        document.getElementById('time-manual').classList.remove('disabled');
        document.getElementById('timezone').classList.remove('disabled');
      }
    },

    updateTimezone: function dt_updateTimezone(timezone) {
      this._elements.timeZoneValue.textContent = timezone;
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
      var format = _('shortTimeFormat');
      this._elements.clockTime.textContent = f.localeFormat(d, format);

      var self = this;
      this._updateClockTimeout =
        window.setTimeout(function updateClockTimeout() {
        self.updateClock();
      }, (59 - d.getSeconds()) * 1000);
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

    _localized: function dt_localized() {
      // Update date and time locale when language is changed
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
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
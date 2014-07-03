/**
 * Used to show Personalization/Date & Time panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DateTime = require('modules/date_time');
  var tzSelect = require('shared/tz_select');

  return function ctor_date_time_panel() {
    return SettingsPanel({
      onInit: function(panel) {
        this._elements = {
          timeAutoSwitch: panel.querySelector('.time-auto'),
          timezoneRegion: panel.querySelector('.timezone-region'),
          timezoneCity: panel.querySelector('.timezone-city'),
          datePicker: panel.querySelector('.date-picker'),
          timePicker: panel.querySelector('.time-picker'),
          clockDate: panel.querySelector('.clock-date'),
          clockTime: panel.querySelector('.clock-time'),
          timezoneRaw: panel.querySelector('.timezone-raw'),
          timezoneValue: panel.querySelector('.timezone-value'),
          timeManual: panel.querySelector('.time-manual'),
          timezone: panel.querySelector('.timezone')
        };

        // update date/clock periodically
        this._boundSetDate = function() {
          this._elements.clockDate.textContent = DateTime.date;
        }.bind(this);

        this._boundSetTime = function() {
          this._elements.clockTime.textContent = DateTime.time;
        }.bind(this);

        this._boundSetTimezone = function(timezone) {
          this._elements.timezoneValue.textContent = timezone;
        }.bind(this);

        // Reset the timezone to the previous user selected value
        this._boundSetSelectedTimeZone = function(selected) {
          DateTime.setUserSelectedTimezone(selected);
        }.bind(this);

        this._boundUpdateUI = this._updateUI.bind(this);

        this._boundDatePickerChange =
          this._datePickerChange.bind(this);

        this._boundTimePickerChange =
          this._timePickerChange.bind(this);
      },
      onBeforeShow: function() {
        DateTime.observe('date', this._boundSetDate);
        DateTime.observe('time', this._boundSetTime);
        DateTime.observe('clockAutoEnabled', this._boundUpdateUI);
        DateTime.observe('clockAutoAvailable', this._boundUpdateUI);
        DateTime.observe('timezoneAutoAvailable', this._boundUpdateUI);
        DateTime.observe('timezone', this._boundSetTimezone);
        DateTime.observe('userSelectedTimezone',
          this._boundSetSelectedTimeZone);

        this._elements.datePicker.addEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.addEventListener('input',
          this._boundTimePickerChange);

        this._renderTimeZone();
        this._boundSetDate();
        this._boundSetTime();
        this._boundSetTimezone(DateTime.timezone);
        if (DateTime.userSelectedTimezone && !DateTime.clockAutoEnabled) {
          this._boundSetSelectedTimeZone(DateTime.userSelectedTimezone);
        }
        this._boundUpdateUI();

        window.addEventListener('localized', this);
      },

      onHide: function() {
        DateTime.unobserve('date', this._boundSetDate);
        DateTime.unobserve('time', this._boundSetTime);
        DateTime.unobserve('clockAutoEnabled', this._boundUpdateUI);
        DateTime.unobserve('clockAutoAvailable', this._boundUpdateUI);
        DateTime.unobserve('timezoneAutoAvailable', this._boundUpdateUI);
        DateTime.unobserve('timezone', this._boundSetTimezone);
        DateTime.unobserve('userSelectedTimezone',
          this._boundSetSelectedTimeZone);

        this._elements.datePicker.removeEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.removeEventListener('input',
          this._boundTimePickerChange);

        window.removeEventListener('localized', this);
      },

      /**
       * monitor time.timezone changes, see /shared/js/tz_select.js
       */
      _renderTimeZone: function dt_renderTimeZone() {
        var noOp = function() {};
        tzSelect(this._elements.timezoneRegion, this._elements.timezoneCity,
          noOp, noOp);
      },

      /**
       * Update DatePicker value
       */
      _datePickerChange: function dt_datePickerChange() {
        DateTime.setTime('date', this._elements.datePicker.value);
        // Clean up the value of picker once we get date set by the user.
        // It will get new date according system time when pop out again.
        this._elements.datePicker.value = '';
      },

      /**
       * Update TimePicker value
       */
      _timePickerChange: function dt_timePickerChange() {
        DateTime.setTime('time', this._elements.timePicker.value);
        // Clean up the value of picker once we get time set by the user.
        // It will get new time according system time when pop out again.
        this._elements.timePicker.value = '';
      },

      handleEvent: function dt_handleEvent(evt) {
        switch (evt.type) {
          case 'localized':
            this._localized(
              this._elements.clockDate, this._elements.clockTime);
            break;
        }
      },

      /**
       * Update date and time format, list of timezone regions
       * when language is changed
       */
      _localized: function dt_localized(clockDate, clockTime) {
        var d = new Date();
        var f = new navigator.mozL10n.DateTimeFormat();
        var _ = navigator.mozL10n.get;
        var format = _('shortTimeFormat');
        clockDate.textContent = f.localeFormat(d, '%x');
        clockTime.textContent = f.localeFormat(d, format);
        this._renderTimeZone();
      },

      _updateUI: function dt_updateUI() {
        this._elements.timeAutoSwitch.dataset.state =
            DateTime.clockAutoEnabled ? 'auto' : 'manual';
        this._elements.datePicker.disabled = DateTime.clockAutoEnabled;
        this._elements.timePicker.disabled = DateTime.clockAutoEnabled;
        this._elements.timezoneRegion.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);
        this._elements.timezoneCity.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);

        this._elements.timezoneRaw.hidden =
          !(DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);
        this._elements.timeAutoSwitch.hidden =
            !(DateTime.clockAutoAvailable || DateTime.timezoneAutoAvailable);
        this._elements.timeAutoSwitch.hidden =
            !(DateTime.clockAutoAvailable || DateTime.timezoneAutoAvailable);

        if (DateTime.clockAutoEnabled) {
          this._elements.timeManual.classList.add('disabled');
          if (DateTime.timezoneAutoAvailable) {
            this._elements.timezone.classList.add('disabled');
          }
        } else {
          this._elements.timeManual.classList.remove('disabled');
          this._elements.timezone.classList.remove('disabled');
        }
      }
    });
  };
});

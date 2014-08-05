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
          timeManual: panel.querySelector('.time-manual'),
          timezone: panel.querySelector('.timezone'),
          timeFormatDate: panel.querySelector('.time-format-date'),
          timeFormatTime: panel.querySelector('.time-format-time')
        };

        // update date/clock periodically
        this.boundSetDate = function() {
          this._elements.clockDate.textContent = DateTime.date;
        }.bind(this);
        this.boundSetClock = function() {
          this._elements.clockTime.textContent = DateTime.clock;
        }.bind(this);
        this._boundDatePickerChange = function () {
          this._datePickerChange();
        }.bind(this);
        this._boundTimePickerChange = function () {
          this._timePickerChange();
        }.bind(this);
        // Monitor time.clock.automatic-update.enabled changes.
        // Also sync to time.timezone.automatic-update.enabled.
        this.boundSetTimeAutoEnabled = function(enabled) {
          this._elements.timeAutoSwitch.dataset.state =
            enabled ? 'auto' : 'manual';

          DateTime.setTimezoneAutoEnabled(enabled);

          this._updateUI();
        }.bind(this);

        this.boundSetClockAutoAvailable = function(available) {
          this._elements.timeAutoSwitch.hidden =
            !(DateTime.clockAutoAvailable || DateTime.timezoneAutoAvailable);
          DateTime.setClockAutoAvailable();
        }.bind(this);
        this.boundSetTimezoneAutoAvailable = function(available) {
          this._elements.timeAutoSwitch.hidden =
            !(DateTime.clockAutoAvailable || DateTime.timezoneAutoAvailable);
          DateTime.setTimezoneAutoAvailable();
        }.bind(this);

        /**
         * Reset the timezone to the previous user selected value
         */
        this.boundSetSelectedTimeZone = function(selected) {
          DateTime.setUserSelectedTimezone(selected);
        }.bind(this);
      },
      onBeforeShow: function() {
        DateTime.observe('date', this.boundSetDate);
        DateTime.observe('clock', this.boundSetClock);
        DateTime.observe('clockAutoEnabled', this.boundSetTimeAutoEnabled);
        DateTime.observe('clockAutoAvailable', this.boundSetClockAutoAvailable);
        DateTime.observe('timezoneAutoAvailable',
          this.boundSetTimezoneAutoAvailable);
        DateTime.observe('timezone', this.boundSetTimezone);
        DateTime.observe('userSelectedTimezone',
          this.boundSetSelectedTimeZone);

        this._elements.datePicker.addEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.addEventListener('input',
          this._boundTimePickerChange);

        this.setTimeZone();
        this.boundSetDate();
        this.boundSetClock();
        this.boundSetTimeAutoEnabled(DateTime.clockAutoEnabled);
        this.boundSetClockAutoAvailable(DateTime.clockAutoAvailable);
        this.boundSetTimezoneAutoAvailable(DateTime.timezoneAutoAvailable);
        if (DateTime.userSelectedTimezone) {
          if (!DateTime.clockAutoEnabled) {
            this.boundSetSelectedTimeZone(DateTime.userSelectedTimezone);
          }
        }
        this.renderTimeFormatDate();
        this.renderTimeFormatTime();

        window.addEventListener('localized', this);
      },
      onHide: function() {
        DateTime.unobserve('date', this.boundSetDate);
        DateTime.unobserve('clock', this.boundSetClock);
        DateTime.unobserve('clockAutoEnabled', this.boundSetTimeAutoEnabled);
        DateTime.unobserve('clockAutoAvailable',
          this.boundSetClockAutoAvailable);
        DateTime.unobserve('timezoneAutoAvailable',
          this.boundSetTimezoneAutoAvailable);
        DateTime.unobserve('timezone', this.boundSetTimezone);
        DateTime.unobserve('userSelectedTimezone',
          this.boundSetSelectedTimeZone);

        this._elements.datePicker.removeEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.removeEventListener('input',
          this._boundTimePickerChange);

        window.removeEventListener('localized', this);
      },
      /**
       * monitor time.timezone changes, see /shared/js/tz_select.js
       */
      setTimeZone: function dt_setTimeZone() {
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
       * Update date and time locale when language is changed
       */
      _localized: function dt_localized(clockDate, clockTime) {
        var d = new Date();
        var f = new navigator.mozL10n.DateTimeFormat();
        var _ = navigator.mozL10n.get;
        var format = _('shortTimeFormat');
        clockDate.textContent = f.localeFormat(d, '%x');
        clockTime.textContent = f.localeFormat(d, format);
      },
      _updateUI: function dt_updateUI() {
        this._elements.datePicker.disabled = DateTime.clockAutoEnabled;
        this._elements.timePicker.disabled = DateTime.clockAutoEnabled;
        this._elements.timezoneRegion.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);
        this._elements.timezoneCity.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);

        if (DateTime.clockAutoEnabled) {
          this._elements.timeManual.classList.add('disabled');
          if (DateTime.timezoneAutoAvailable) {
            this._elements.timezone.classList.add('disabled');
          }
        } else {
          this._elements.timeManual.classList.remove('disabled');
          this._elements.timezone.classList.remove('disabled');
        }
      },
      renderTimeFormatDate: function dt_renderTimeFormatDate() {
        // follow format
        // http://pubs.opengroup.org/onlinepubs/007908799/xsh/strftime.html
        //TODO: generate options from DateTime
        var options = [{
          format: 'MDY', // 12/31/2014
          selected: false
        }, {
          format: 'DMY', // 31/12/2014
          selected: false
        }, {
          format: 'YMD', // 2014/12/31
          selected: false
        }];
        // TODO: restore state before render elements
        var d = new Date();
        for (var i = 0; i < options.length; i++) {
          var format = DateTime['DATEFORMAT_' + options[i].format];
          var option = document.createElement('option');
          option.textContent = d.toLocaleFormat(format);
          option.selected = options[i].selected;
          option.value = format;
          this._elements.timeFormatDate.appendChild(option);
        }
      },
      renderTimeFormatTime: function dt_renderTimeFormatTime() {
        var options = [{
          text: '12-hour', // 2:00PM
          selected: DateTime.timeFormat,
          value: true,
        }, {
          text: '24-hour', // 14:00
          selected: DateTime.timeFormat,
          value: false
        }];
        // TODO: restore state before render elements
        for (var i = 0; i < options.length; i++) {
          var option = document.createElement('option');
          option.textContent = options[i].text;
          option.selected = options[i].selected;
          option.value = options[i].value;
          this._elements.timeFormatTime.appendChild(option);
        }
      }
    });
  };
});

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
          dateFormat: panel.querySelector('.time-format-date'),
          timeFormat: panel.querySelector('.time-format-time')
        };

        // update date/clock periodically
        this._boundSetDate = function() {
          this._elements.clockDate.textContent = DateTime.date;
          // change date -> redraw dateFormat with user pref
          this._renderDateFormat();
        }.bind(this);

        this._boundSetTime = function() {
          this._elements.clockTime.textContent = DateTime.time;
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

        this._boundDateFormatChange = function() {
          DateTime.setCurrentDateFormat(this._elements.dateFormat.value);
        }.bind(this);

        this._boundTimeFormatChange = function() {
          var value = (this._elements.timeFormat.value === '1');
          DateTime.setCurrentHour12(value);
        }.bind(this);
      },
      onBeforeShow: function() {
        DateTime.observe('date', this._boundSetDate);
        DateTime.observe('time', this._boundSetTime);
        DateTime.observe('clockAutoEnabled', this._boundUpdateUI);
        DateTime.observe('clockAutoAvailable', this._boundUpdateUI);
        DateTime.observe('timezoneAutoAvailable', this._boundUpdateUI);
        DateTime.observe('userSelectedTimezone',
          this._boundSetSelectedTimeZone);

        this._elements.datePicker.addEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.addEventListener('input',
          this._boundTimePickerChange);
        this._elements.dateFormat.addEventListener('change',
          this._boundDateFormatChange);
        this._elements.timeFormat.addEventListener('change',
          this._boundTimeFormatChange);

        this._renderTimeZone();
        this._boundSetDate();
        this._boundSetTime();
        if (DateTime.userSelectedTimezone && !DateTime.clockAutoEnabled) {
          this._boundSetSelectedTimeZone(DateTime.userSelectedTimezone);
        }
        this._boundUpdateUI();
        this._renderDateFormat();
        this._renderTimeFormat();

        window.addEventListener('localized', this);
      },

      onHide: function() {
        DateTime.unobserve('date', this._boundSetDate);
        DateTime.unobserve('time', this._boundSetTime);
        DateTime.unobserve('clockAutoEnabled', this._boundUpdateUI);
        DateTime.unobserve('clockAutoAvailable', this._boundUpdateUI);
        DateTime.unobserve('timezoneAutoAvailable', this._boundUpdateUI);
        DateTime.unobserve('userSelectedTimezone',
          this._boundSetSelectedTimeZone);

        this._elements.datePicker.removeEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.removeEventListener('input',
          this._boundTimePickerChange);
        this._elements.dateFormat.removeEventListener('change',
          this._boundDateFormatChange);
        this._elements.timeFormat.removeEventListener('change',
          this._boundTimeFormatChange);

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

      /**
       * Update Panel UI elements
       */
      _updateUI: function dt_updateUI() {
        this._elements.timeAutoSwitch.dataset.state =
            DateTime.clockAutoEnabled ? 'auto' : 'manual';
        this._elements.datePicker.disabled = DateTime.clockAutoEnabled;
        this._elements.timePicker.disabled = DateTime.clockAutoEnabled;
        this._elements.timezoneRegion.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);
        this._elements.timezoneCity.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);

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
      },

      /**
       * Update DateFormat selector selection and values
       */
      _renderDateFormat: function dt_renderDateFormat() {
        // restore default selection
        var selectedFormat = DateTime.DATEFORMAT_MDY;
        if (DateTime.currentDateFormat != null) {
          selectedFormat = DateTime.currentDateFormat;
        }

        var options = [{
          format: DateTime.DATEFORMAT_MDY, // 12/31/2014
        }, {
          format: DateTime.DATEFORMAT_DMY, // 31/12/2014
        }, {
          format: DateTime.DATEFORMAT_YMD, // 2014/12/31
        }];

        var obj = this._elements.dateFormat;
        while(obj.options.length) { // clean options
          obj.remove(0);
        }
        var d = new Date();
        for (var i = 0; i < options.length; i++) {
          var option = document.createElement('option');
          option.textContent = d.toLocaleFormat(options[i].format);
          option.selected = (options[i].format === selectedFormat);
          option.value = options[i].format;
          obj.appendChild(option);
        }
      },

      /**
       * Update TimeFormat selector
       */
      _renderTimeFormat: function dt_renderTimeFormat() {
        // restore default selection
        var selectedItem = 0;
        if (DateTime.currentHour12 != null &&
          !DateTime.currentHour12) {
          selectedItem = 1;
        }

        var options = [{
          text: '12-hour', // 2:00PM
          value: 1,
        }, {
          text: '24-hour', // 14:00
          value: 0
        }];

        var obj = this._elements.timeFormat;
        while(obj.options.length) { // clean options
          obj.remove(0);
        }
        for (var i = 0; i < options.length; i++) {
          var option = document.createElement('option');
          option.textContent = options[i].text;
          option.selected = (selectedItem === i);
          option.value = options[i].value;
          obj.appendChild(option);
        }
      }
    });
  };
});

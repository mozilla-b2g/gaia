/**
 * Used to show Personalization/Date & Time panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DateTime = require('modules/date_time');
  var tzSelect = require('shared/tz_select');

  return function ctor_date_time_panel() {
    var HOUR_12 = 'ampm';
    var HOUR_24 = '24';
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
          timezonePickers: [].slice.apply(
            panel.querySelectorAll('.timezone-picker')),
          timezoneInfo: panel.querySelector('.timezone-info'),
          timezoneInfoText: panel.querySelector('.timezone-info-text'),
          timeFormat: panel.querySelector('.time-format-time')
        };

        // update date/clock periodically
        this._boundSetDate = () => {
          this._elements.clockDate.textContent = DateTime.date;
        };

        this._boundSetTime = () => {
          this._elements.clockTime.textContent = DateTime.time;
        };

        this._boundSetTimezoneInfo = () => {
          // Only display the timezone info when auto time is enabled.
          var info = DateTime.clockAutoEnabled ? DateTime.timezone : '';
          this._elements.timezoneInfoText.textContent = info;
        };

        // Reset the timezone to the previous user selected value
        this._boundSetSelectedTimeZone = (selected) => {
          DateTime.setUserSelectedTimezone(selected);
        };

        this._boundUpdateUI = this._updateUI.bind(this);
        this._boundDatePickerChange = this._datePickerChange.bind(this);
        this._boundTimePickerChange = this._timePickerChange.bind(this);

        this._boundTimeFormatChange = () => {
          var value = (this._elements.timeFormat.value === HOUR_12);
          DateTime.setCurrentHour12(value);
        };
      },
      onBeforeShow: function() {
        DateTime.observe('date', this._boundSetDate);
        DateTime.observe('time', this._boundSetTime);
        DateTime.observe('timezone', this._boundSetTimezoneInfo);
        DateTime.observe('clockAutoEnabled', this._boundUpdateUI);
        DateTime.observe('clockAutoAvailable', this._boundUpdateUI);
        DateTime.observe('timezoneAutoAvailable', this._boundUpdateUI);
        DateTime.observe('userSelectedTimezone',
          this._boundSetSelectedTimeZone);

        this._elements.datePicker.addEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.addEventListener('input',
          this._boundTimePickerChange);
        this._elements.timeFormat.addEventListener('change',
          this._boundTimeFormatChange);

        this._renderTimeZone();
        this._boundSetDate();
        this._boundSetTime();
        this._boundSetTimezoneInfo();
        if (DateTime.userSelectedTimezone && !DateTime.clockAutoEnabled) {
          this._boundSetSelectedTimeZone(DateTime.userSelectedTimezone);
        }
        this._renderTimeFormat();
        this._boundUpdateUI();

        window.addEventListener('localized', this);
      },

      onHide: function() {
        DateTime.unobserve('date', this._boundSetDate);
        DateTime.unobserve('time', this._boundSetTime);
        DateTime.unobserve('timezone', this._boundSetTimezoneInfo);
        DateTime.unobserve('clockAutoEnabled', this._boundUpdateUI);
        DateTime.unobserve('clockAutoAvailable', this._boundUpdateUI);
        DateTime.unobserve('timezoneAutoAvailable', this._boundUpdateUI);
        DateTime.unobserve('userSelectedTimezone',
          this._boundSetSelectedTimeZone);

        this._elements.datePicker.removeEventListener('input',
          this._boundDatePickerChange);
        this._elements.timePicker.removeEventListener('input',
          this._boundTimePickerChange);
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
            this._renderTimeZone();
            break;
        }
      },

      /**
       * Update Panel UI elements
       */
      _updateUI: function dt_updateUI() {
        this._elements.timeAutoSwitch.dataset.state =
            DateTime.clockAutoEnabled ? 'auto' : 'manual';
        this._elements.timeAutoSwitch.hidden =
          this._elements.timezoneInfo.hidden =
            !(DateTime.clockAutoAvailable || DateTime.timezoneAutoAvailable);

        this._elements.datePicker.disabled = DateTime.clockAutoEnabled &&
          !this._elements.timeAutoSwitch.hidden;
        this._elements.timePicker.disabled = DateTime.clockAutoEnabled &&
          !this._elements.timeAutoSwitch.hidden;
        this._elements.timezoneRegion.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);
        this._elements.timezoneCity.disabled =
          (DateTime.timezoneAutoAvailable && DateTime.clockAutoEnabled);

        // XXX: Force to trigger the selector change so that tz_select is able
        //      to write the previous user-selected value back to time.timezone.
        if (!DateTime.clockAutoEnabled) {
          this._elements.timezoneRegion.dispatchEvent(new Event('change'));
          this._elements.timezoneCity.dispatchEvent(new Event('change'));
        }

        if (DateTime.clockAutoEnabled &&
          !this._elements.timeAutoSwitch.hidden) {
          this._elements.timeManual.classList.add('disabled');
          if (DateTime.timezoneAutoAvailable) {
            this._elements.timezonePickers.forEach((picker) => {
              picker.hidden = true;
            });
            this._elements.timezoneInfo.hidden = false;
          }
        } else {
          this._elements.timeManual.classList.remove('disabled');
          this._elements.timezonePickers.forEach((picker) => {
            picker.hidden = false;
          });
          this._elements.timezoneInfo.hidden = true;
        }
      },

      /**
       * Update TimeFormat selector
       */
      _renderTimeFormat: function dt_renderTimeFormat() {
        // restore default selection
        var selectedItem = 0;
        if (!DateTime.currentHour12) {
          selectedItem = 1;
        }

        var options = [{
          attr: 'hour-12', // 2:00PM
          value: HOUR_12,
        }, {
          attr: 'hour-24', // 14:00
          value: HOUR_24
        }];

        var obj = this._elements.timeFormat;
        while(obj.options.length) { // clean options
          obj.remove(0);
        }
        for (var i = 0; i < options.length; i++) {
          var option = document.createElement('option');
          option.setAttribute('data-l10n-id', options[i].attr);
          option.selected = (selectedItem === i);
          option.value = options[i].value;
          obj.appendChild(option);
        }
      }
    });
  };
});

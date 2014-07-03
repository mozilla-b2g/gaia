/**
 * Used to show Device/Help panel
 */
define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel'),
      DateTime = require('panels/date_time/date_time');

  return function ctor_date_time_panel() {
    var dateTime = DateTime();
    return SettingsPanel({
      onInit: function(panel) {
        dateTime.init({
          timeAutoSwitch: panel.querySelector('#time-auto'),
          timezoneRegion: panel.querySelector('#timezone-region'),
          timezoneCity: panel.querySelector('#timezone-city'),
          datePicker: panel.querySelector('#date-picker'),
          timePicker: panel.querySelector('#time-picker'),
          clockDate: panel.querySelector('#clock-date'),
          clockTime: panel.querySelector('#clock-time'),
          timeZone: panel.querySelector('#timezone-raw'),
          timeZoneValue: panel.querySelector('#timezone-value')
        });
      }
    });
  };
});

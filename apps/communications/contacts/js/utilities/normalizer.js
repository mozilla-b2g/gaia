'use strict';

var utils = window.utils || {};

if (!utils.time) {
  (function() {
    utils.time = {};

    var _ = navigator.mozL10n.get;

    utils.time.pretty = function(time, now) {
      // 'now' attribute for test purposes.
      var prettyDate = '';

      if (!time) {
        return prettyDate;
      }

      function roundToDay(date) {
        var rounded = new Date(date);
        rounded.setHours(0);
        rounded.setMinutes(0);
        rounded.setSeconds(0);
        rounded.setMilliseconds(0);
        return rounded;
      }

      var dtf = new navigator.mozL10n.DateTimeFormat();
      now = now || Date.now();
      var day_diff = (roundToDay(now) - roundToDay(time)) / 86400000;
      if (!isNaN(day_diff)) {
        // Woohh we are on the future here
        if (day_diff < 0) {
          prettyDate = dtf.localeFormat(new Date(time),
                                                    _('dateTimeFormat_%x'));
        } else {
          prettyDate = day_diff === 0 && _('today') ||
                       day_diff === 1 && _('yesterday') ||
                       day_diff < 6 && dtf.localeFormat(new Date(time), '%A') ||
                       dtf.localeFormat(new Date(time), '%x');
        }
      }

      var timeFormat = window.navigator.mozHour12 ?
       _('shortTimeFormat12') : _('shortTimeFormat24');

      return prettyDate + ' ' +
                        dtf.localeFormat(new Date(time), timeFormat);
    };
  })();
}

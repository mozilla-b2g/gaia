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

      now = now || Date.now();
      var day_diff = (roundToDay(now) - roundToDay(time)) / 86400000;
      if (!isNaN(day_diff)) {
        // Woohh we are on the future here
        if (day_diff < 0) {
          prettyDate = (new Date(time)).toLocaleString(navigator.languages, {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
          });
        } else {
          if (day_diff === 0) {
            prettyDate = _('today');
          } else if (day_diff === 1) {
            prettyDate = _('yesterday');
          } else if (day_diff < 6) {
            prettyDate = (new Date(time)).toLocaleString(navigator.languages, {
              weekday: 'long'
            });
          } else {
            prettyDate = (new Date(time)).toLocaleString(navigator.languages, {
              year: '2-digit',
              month: '2-digit',
              day: '2-digit'
            });
          }
        }
      }

      var timeString = (new Date(time)).toLocaleString(navigator.languages, {
        hour12: navigator.mozHour12,
        hour: 'numeric',
        minute: 'numeric'
      });

      //XXX: This order should not be hardcoded. Change once we have
      // relative date/time in Intl
      return prettyDate + ' ' + timeString;
    };
  })();
}

'use strict';

var utils = window.utils || {};

if (!utils.time) {
  (function() {
    utils.time = {};

    var _ = navigator.mozL10n.get;

    utils.time.pretty = function(time) {
      var prettyDate = '';

      if (!time) {
        return prettyDate;
      }

      var dtf = new navigator.mozL10n.DateTimeFormat();
      var diff = (Date.now() - time) / 1000;
      var day_diff = Math.floor(diff / 86400);
      if (!isNaN(day_diff)) {
        // Woohh we are on the future here
        if (day_diff < 0 || diff < 0) {
          prettyDate = dtf.localeFormat(new Date(time),
                                                    _('dateTimeFormat_%x'));
        } else {
          prettyDate = day_diff === 0 && _('today') ||
                       day_diff === 1 && _('yesterday') ||
                       day_diff < 6 && dtf.localeFormat(new Date(time), '%A') ||
                       dtf.localeFormat(new Date(time), '%x');
        }
      }

      return prettyDate + ' ' +
                        dtf.localeFormat(new Date(time), _('shortTimeFormat'));
    };
  })();
}

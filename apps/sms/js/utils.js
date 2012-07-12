/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Based on Resig's pretty date
var _ = navigator.mozL10n.get;

var Utils = {

  escapeHTML: function ut_escapeHTML(str, escapeQuotes) {
    var span = document.createElement('span');
    span.textContent = str;

    // Escape space for displaying multiple space in message.
    span.innerHTML = span.innerHTML.replace(/\s/g, '&nbsp;');

    if (escapeQuotes)
      return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    return span.innerHTML;
  },

  getHourMinute: function ut_getHourMinute(time) {
    switch (time.constructor) {
      case String:
        time = parseInt(time);
        break;
      case Date:
        time = time.getTime();
        break;
    }

    return (new Date(time)).toLocaleFormat('%R %p');
  },
  getDayDate: function re_getDayDate(timestamp) {
    var date = new Date(timestamp);
    var startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },
  getHeaderDate: function ut_giveHeaderDate(time) {
    switch (time.constructor) {
      case String:
        time = new Number(time);
        break;
      case Date:
        time = time.getTime();
        break;
    }

    var today = Math.floor((new Date()).getTime() / 86400000);
    var otherDay = Math.floor(time / 86400000);
    var dayDiff = today - otherDay;

    if (isNaN(dayDiff))
      return '(incorrect date)';

    if (dayDiff < 0) {
      // future time
      return (new Date(time)).toLocaleFormat('%x %R');
    }

    return dayDiff == 0 && _('today') ||
      dayDiff == 1 && _('yesterday') ||
      dayDiff < 4 && (new Date(time)).toLocaleFormat('%A') ||
      (new Date(time)).toLocaleFormat('%x');
  }
};

(function() {
  var updateHeadersDate = function updateHeadersDate() {
    var labels = document.querySelectorAll('div.groupHeader');
    var i = labels.length;
    while (i--) {
      labels[i].textContent = giveHeaderDate(labels[i].dataset.time);
    }
  };
  var timer = setInterval(updateHeadersDate, 60 * 1000);

  document.addEventListener('mozvisibilitychange', function visibility(e) {
    clearTimeout(timer);
    if (!document.mozHidden) {
      updateHeadersDate();
      timer = setInterval(updateHeadersDate, 60 * 1000);
    }
  });
})();

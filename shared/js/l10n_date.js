/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This lib relies on `l10n.js' to implement localizable date/time strings.
 *
 * The proposed `DateTimeFormat' object should provide all the features that are
 * planned for the `Intl.DateTimeFormat' constructor, but the API does not match
 * exactly the ES-i18n draft.
 *   - https://bugzilla.mozilla.org/show_bug.cgi?id=769872
 *   - http://wiki.ecmascript.org/doku.php?id=globalization:specification_drafts
 *
 * Besides, this `DateTimeFormat' object provides two features that aren't
 * planned in the ES-i18n spec:
 *   - a `toLocaleFormat()' that really works (i.e. fully translated);
 *   - a `fromNow()' method to handle relative dates ("pretty dates").
 */

navigator.mozL10n.DateTimeFormat = function(locales, options) {
  var _ = navigator.mozL10n.get;

  function zeroPad(number) {
    return (number < 10) ? ('0' + number) : number;
  }

  // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/toLocaleFormat
  function localeFormat(d, format) {
    var tokens = format.match(/(%E.|%O.|%.)/g);

    for (var i = 0; tokens && i < tokens.length; i++) {
      var value = '';

      // http://pubs.opengroup.org/onlinepubs/007908799/xsh/strftime.html
      switch (tokens[i]) {
        // localized day/month names
        case '%a':
          value = _('weekday-' + d.getDay() + '-short');
          break;
        case '%A':
          value = _('weekday-' + d.getDay() + '-long');
          break;
        case '%b':
        case '%h':
          value = _('month-' + d.getMonth() + '-short');
          break;
        case '%B':
          value = _('month-' + d.getMonth() + '-long');
          break;
        case '%I':
          value = d.getHours() % 12 || 12;
          break;

        // localized date/time strings
        case '%c':
        case '%x':
        case '%X':
          // ensure the localized format string doesn't contain any %c|%x|%X
          var tmp = _('dateTimeFormat_' + tokens[i]);
          if (tmp && !(/(%c|%x|%X)/).test(tmp)) {
            value = localeFormat(d, tmp);
          }
          break;

        // other tokens don't require any localization
      }

      format = format.replace(tokens[i], value || d.toLocaleFormat(tokens[i]));
    }

    return format;
  }

  // variant of John Resig's PrettyDate.js
  function prettyDate(time) {
    switch (time.constructor) {
      case String: // timestamp
        time = parseInt(time);
        break;
      case Date:
        time = time.getTime();
        break;
    }

    var secDiff = (Date.now() - time) / 1000;
    if (isNaN(secDiff)) {
      return _('incorrectDate');
    }

    if (secDiff >= 0) { // past
      var dayDiff = Math.floor(secDiff / 86400);
      if (secDiff < 3600) {
        return _('minutesAgo', { m: Math.floor(secDiff / 60) });
      } else if (dayDiff === 0) {
        return _('hoursAgo', { h: Math.floor(secDiff / 3600) });
      } else if (dayDiff < 10) {
        return _('daysAgo', { d: dayDiff });
      }
    }

    if (secDiff < 0) { // future
      secDiff = -secDiff;
      dayDiff = Math.floor(secDiff / 86400);
      if (secDiff < 3600) {
        return _('inMinutes', { m: Math.floor(secDiff / 60) });
      } else if (dayDiff === 0) {
        return _('inHours', { h: Math.floor(secDiff / 3600) });
      } else if (dayDiff < 10) {
        return _('inDays', { d: dayDiff });
      }
    }

    // too far: return an absolute date
    return localeFormat(new Date(time), '%x');
  }

  // API
  return {
    localeDateString: function localeDateString(d) {
      return localeFormat(d, '%x');
    },
    localeTimeString: function localeTimeString(d) {
      return localeFormat(d, '%X');
    },
    localeString: function localeString(d) {
      return localeFormat(d, '%c');
    },
    localeFormat: localeFormat,
    fromNow: prettyDate
  };
};


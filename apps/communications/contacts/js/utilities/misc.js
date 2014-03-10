'use strict';

var utils = window.utils || {};

if (!utils.misc) {
  utils.misc = {};
  utils.misc.toMozContact = function ut_toMozContact(contact) {
    var outContact = contact;
    if (!(contact instanceof mozContact)) {
      outContact = new mozContact(contact);
      outContact.id = contact.id || outContact.id;
    }
    return outContact;
  };

  utils.misc.formatDate = function formatDate(date) {
    // This year indicates that the year can be ignored
    var FLAG_YEAR_IGNORED = 9996;
    var _ = navigator.mozL10n.get;

    var year = date.getFullYear();
    if (year === FLAG_YEAR_IGNORED) {
      year = '';
    }
    var dateFormat = _('dateFormat') || '%B %e';
    var f = new navigator.mozL10n.DateTimeFormat();
    try {
      var offset = date.getTimezoneOffset() * 60 * 1000;
      var normalizedDate = new Date(date.getTime() + offset);
      var dayMonthString = f.localeFormat(normalizedDate, dateFormat);
      var dateString = _('dateOutput', {
        dayMonthFormatted: dayMonthString,
        year: year
      });
    } catch (err) {
      console.error('Error parsing date: ', err);
      throw err;
    }

    return dateString;
  };
}

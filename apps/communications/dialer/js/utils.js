'use strict';

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    return dtf.localeFormat(new Date(time), _('shortTimeFormat'));
  },

  headerDate: function ut_headerDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    var today = _('today');
    var yesterday = _('yesterday');
    var diff = (Date.now() - time) / 1000;
    var day_diff = Math.floor(diff / 86400);
    if (isNaN(day_diff))
      return '(incorrect date)';
    if (day_diff < 0 || diff < 0) {
      return dtf.localeFormat(new Date(time), _('shortDateTimeFormat'));
    }
    return day_diff == 0 && today ||
      day_diff == 1 && yesterday ||
      day_diff < 6 && dtf.localeFormat(new Date(time), '%A') ||
      dtf.localeFormat(new Date(time), '%x');
  },

  getDayDate: function re_getDayDate(timestamp) {
    var date = new Date(timestamp),
      startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },

  getPhoneNumberPrimaryInfo: function ut_getPhoneNumberPrimaryInfo(matchingTel,
    contact) {
    if (contact) {
      if (contact.name && String(contact.name) !== '') {
        return contact.name;
      } else if (contact.org && String(contact.org) !== '') {
        return contact.org;
      }
    }
    if (matchingTel) {
      return matchingTel.value;
    }
    return null;
  },

  // XXX: this is way too complex for the task accomplished
  getPhoneNumberAdditionalInfo: function ut_getPhoneNumberAdditionalInfo(
    matchingTel, associatedContact) {
    var additionalInfo, phoneType, phoneCarrier,
        contactPhoneEntry, contactPhoneNumber, contactPhoneType,
        contactPhoneCarrier, multipleNumbersSameCarrier,
        length = associatedContact.tel.length;

    // Phone type is a mandatory field.
    contactPhoneNumber = matchingTel.value;
    additionalInfo = matchingTel.type;
    phoneType = matchingTel.type;
    if (matchingTel.carrier) {
      phoneCarrier = matchingTel.carrier;
    } else {
      additionalInfo = additionalInfo + ', ' + contactPhoneNumber;
    }

    if (phoneType && phoneCarrier) {
      var multipleNumbersSameCarrier = false;
      for (var j = 0; j < length; j++) {
        contactPhoneEntry = associatedContact.tel[j];
        contactPhoneType = contactPhoneEntry.type;
        contactPhoneCarrier = contactPhoneEntry.carrier;

        if ((contactPhoneEntry.value != contactPhoneNumber) &&
            (phoneType == contactPhoneType) &&
            (phoneCarrier == contactPhoneCarrier)) {
          multipleNumbersSameCarrier = true;
          break;
        }
      }

      if (multipleNumbersSameCarrier) {
        additionalInfo = additionalInfo + ', ' + contactPhoneNumber;
      } else {
        additionalInfo = additionalInfo + ', ' + phoneCarrier;
      }
    }
    return additionalInfo;
  }
};


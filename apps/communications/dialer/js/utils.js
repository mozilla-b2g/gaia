'use strict';

// Based on Resig's pretty date.
var _ = navigator.mozL10n.get;

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var date = new Date(time);
    var hours = date.getHours();
    var hoursStr = new String(hours);
    var minutes = date.getMinutes();
    var minutesStr = new String(minutes);
    var meridiem = 'AM';
    if (hours < 10) {
      hoursStr = '0' + hoursStr;
    } else if (hours >= 12) {
      meridiem = 'PM';
      if (hours > 12) {
        hoursStr = new String(hours - 12);
      }
    }
    if (minutes < 10) {
      minutesStr = '0' + minutesStr;
    }
    return (hoursStr + ':' + minutesStr + ' ' + meridiem);
  },

  headerDate: function ut_headerDate(time) {
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

  getPhoneNumberAdditionalInfo: function ut_getPhoneNumberAdditionalInfo(
    phoneNumber, associatedContact) {
    var additionalInfo, phoneType, phoneCarrier,
        contactPhoneEntry, contactPhoneNumber, contactPhoneType,
        contactPhoneCarrier, multipleNumbersSameCarrier,
        length = associatedContact.tel.length;
    for (var i = 0; i < length; i++) {
      contactPhoneEntry = associatedContact.tel[i];
      contactPhoneNumber = contactPhoneEntry.value.replace(' ', '', 'g');
      contactPhoneType = contactPhoneEntry.type;
      contactPhoneCarrier = contactPhoneEntry.carrier;
      if (phoneNumber == contactPhoneNumber) {
        // Phone type is a mandatory field.
        additionalInfo = contactPhoneType;
        phoneType = contactPhoneType;
        if (!contactPhoneCarrier) {
          additionalInfo = additionalInfo + ', ' + phoneNumber;
        } else {
          phoneCarrier = contactPhoneCarrier;
        }
      }
    }
    if (phoneType && phoneCarrier) {
      var multipleNumbersSameCarrier = false;
      for (var j = 0; j < length; j++) {
        contactPhoneEntry = associatedContact.tel[j];
        contactPhoneNumber = contactPhoneEntry.value.replace(' ', '', 'g');
        contactPhoneType = contactPhoneEntry.type;
        contactPhoneCarrier = contactPhoneEntry.carrier;
        if ((phoneNumber != contactPhoneNumber) &&
          (phoneType == contactPhoneType) &&
          (phoneCarrier == contactPhoneCarrier)) {
          multipleNumbersSameCarrier = true;
          break;
        }
      }
      if (multipleNumbersSameCarrier) {
        additionalInfo = additionalInfo + ', ' + phoneNumber;
      } else {
        additionalInfo = additionalInfo + ', ' + phoneCarrier;
      }
    }
    return additionalInfo;
  }
};


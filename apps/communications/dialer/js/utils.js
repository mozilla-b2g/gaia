'use strict';

// Based on Resig's pretty date.
var _ = navigator.mozL10n.get;

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var dtf = new navigator.mozL10n.DateTimeFormat();
    return dtf.localeFormat(new Date(time), _('shortTimeFormat'));
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

  // XXX: this is way too complex for the task accomplished
  getPhoneNumberAdditionalInfo: function ut_getPhoneNumberAdditionalInfo(
    phoneNumber, associatedContact) {
    var additionalInfo, phoneType, phoneCarrier,
        contactPhoneEntry, contactPhoneNumber, contactPhoneType,
        contactPhoneCarrier, multipleNumbersSameCarrier,
        length = associatedContact.tel.length;

    var variants = SimplePhoneMatcher.generateVariants(phoneNumber);

    associatedContact.tel.forEach(function telIterator(tel) {
      var sanitizedNumber = SimplePhoneMatcher.sanitizedNumber(tel.value);
      variants.forEach(function variantIterator(variant) {
        if (variant.indexOf(sanitizedNumber) !== -1 ||
            sanitizedNumber.indexOf(variant) !== -1) {

          // Phone type is a mandatory field.
          contactPhoneNumber = tel.value;
          additionalInfo = tel.type;
          phoneType = tel.type;
          if (tel.carrier) {
            phoneCarrier = tel.carrier;
          } else {
            additionalInfo = additionalInfo + ', ' + sanitizedNumber;
          }
        }
      });
    });

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
        additionalInfo = additionalInfo + ', ' + phoneNumber;
      } else {
        additionalInfo = additionalInfo + ', ' + phoneCarrier;
      }
    }
    return additionalInfo;
  }
};


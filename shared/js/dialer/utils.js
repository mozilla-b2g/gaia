'use strict';

/* exported Utils */

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    return dtf.localeFormat(new Date(time), _('shortTimeFormat'));
  },

  prettyDuration: function(duration) {
    function padNumber(n) {
      return n > 9 ? n : '0' + n;
    }

    var elapsed = new Date(duration);
    var durationL10n = {
      h: padNumber(elapsed.getUTCHours()),
      m: padNumber(elapsed.getUTCMinutes()),
      s: padNumber(elapsed.getUTCSeconds())
    };
    return navigator.mozL10n.get(elapsed.getUTCHours() > 0 ?
      'callDurationHours' : 'callDurationMinutes', durationL10n);
  },

  headerDate: function ut_headerDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    var today = _('today');
    var yesterday = _('yesterday');
    var diff = (Date.now() - time) / 1000;
    var day_diff = Math.floor(diff / 86400);
    if (isNaN(day_diff)) {
      return '(incorrect date)';
    }
    if (day_diff < 0 || diff < 0) {
      return dtf.localeFormat(new Date(time), _('shortDateTimeFormat'));
    }
    return day_diff === 0 && today ||
      day_diff == 1 && yesterday ||
      day_diff < 6 && dtf.localeFormat(new Date(time), '%A') ||
      dtf.localeFormat(new Date(time), '%x');
  },

  getDayDate: function re_getDayDate(timestamp) {
    var date = new Date(timestamp);
    var startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },

  getPhoneNumberPrimaryInfo: function ut_getPhoneNumberPrimaryInfo(matchingTel,
                                                                   contact) {
    if (contact) {
      if (contact.name && contact.name.length && contact.name[0] !== '') {
        return contact.name;
      } else if (contact.org && contact.org.length && contact.org[0] !== '') {
        return contact.org;
      }
    }
    if (matchingTel) {
      return matchingTel.value;
    }
    return null;
  },

  toCamelCase: function ut_toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  _getPhoneNumberType: function ut_getPhoneNumberType(matchingTel) {
    // In case that there is no stored type for this number, we default to
    // "Mobile".
    var type = matchingTel.type;
    if (Array.isArray(type)) {
      type = type[0];
    }

    var _ = navigator.mozL10n.get;

    var result = type ? _(type) : _('mobile');
    result = result ? result : type; // no translation found for this type

    return result;
  },

  /**
   * In case of a call linked to a contact, the additional information of the
   * phone number subject of the call consists in the type and carrier
   * associated with this phone number.
   *
   * Each call is associated with an *unique number* and this phone number can
   * belong to n specific contact(s). We don't care about the contact having
   * more than one phone number, as we are only interested in the additional
   * information of the current call that is associated with *one and only one*
   * phone number.
   *
   * The type of the phone number will be localized if we have a matching key.
   */
  getPhoneNumberAdditionalInfo:
    function ut_getPhoneNumberAdditionalInfo(matchingTel) {
    var result = this._getPhoneNumberType(matchingTel);

    var carrier = matchingTel.carrier;
    if (carrier) {
      result += ', ' + carrier;
    }

    return result;
  },

  getPhoneNumberAndType: function ut_getPhoneNumberAndType(matchingTel) {
    return this._getPhoneNumberType(matchingTel) + ', ' + matchingTel.value;
  }
};

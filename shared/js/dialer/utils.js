'use strict';

/* exported Utils */

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var f = Intl.DateTimeFormat(navigator.languages, {
      hour12: navigator.mozHour12,
      hour: 'numeric',
      minute: 'numeric'
    });
    return f.format(new Date(time));
  },

  /**
   * Renders localized time duration to a given dom node
   * @param {HTMLElement} node that will hold the time duration content
   * @param {Number} time duration in ms
   * @param {String} l10nPrefix prefix used to select the right l10n id.
   *        Default value 'callDuration'.
   */
  prettyDuration: function(node, duration, l10nPrefix) {
    var elapsed = new Date(duration);
    var h = elapsed.getUTCHours();
    var m = elapsed.getUTCMinutes();
    var s = elapsed.getUTCSeconds();

    var l10nId = l10nPrefix || 'callDuration';
    var durationL10n = {
      h: h + '',
      m: m + '',
      s: s + ''
    };

    if (l10nId === 'callDuration') {
      // Pad the args with a leading 0 if we're displaying them in purely
      // digital format.
      durationL10n = {
        h: (h > 9 ? '' : '0') + h,
        m: (m > 9 ? '' : '0') + m,
        s: (s > 9 ? '' : '0') + s
      };
    }

    if (l10nPrefix === 'callDurationTextFormat' && h === 0 && m === 0) {
      // Special case: only display in seconds format (i.e. "5 s") with text
      // formatting, as digital formatting doesn't support this.
      l10nId += 'Seconds';
    } else {
      l10nId += h > 0 ? 'Hours' : 'Minutes';
    }
 
    navigator.mozL10n.setAttributes(node, l10nId, durationL10n);
  },

  setHeaderDate: function ut_setHeaderDate(elem, time) {
    var diff = (Date.now() - time) / 1000;
    var day_diff = Math.floor(diff / 86400);
    var formattedTime;
    if (isNaN(day_diff)) {
      elem.setAttribute('data-l10n-id', 'incorrectDate');
      return;
    } else if (day_diff === 0) {
      elem.setAttribute('data-l10n-id', 'today');
      return;
    } else if (day_diff === 1) {
      elem.setAttribute('data-l10n-id', 'yesterday');
      return;
    } else if (day_diff < 6) {
      formattedTime = (new Date(time)).toLocaleString(navigator.languages, {
        weekday: 'long',
      });
    } else {
      formattedTime = (new Date(time)).toLocaleString(navigator.languages, {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      });
    }
    elem.removeAttribute('data-l10n-id');
    elem.textContent = formattedTime;
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

  _phoneTypesL10n: {
    'mobile':    'phone_type_mobile',
    'home':      'phone_type_home',
    'work':      'phone_type_work',
    'personal':  'phone_type_personal',
    'faxHome':   'phone_type_fax_home',
    'faxOffice': 'phone_type_fax_office',
    'faxOther':  'phone_type_fax_other',
    'other':     'phone_type_other'
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
    // In case that there is no stored type for this number, we default to
    // "Mobile".
    var type = matchingTel.type || 'mobile';
    var carrier = matchingTel.carrier;

    if (Array.isArray(type)) {
      type = type[0];
    }

    var id;
    var args = {};


    if (this._phoneTypesL10n.hasOwnProperty(type)) {
      id = this._phoneTypesL10n[type];
    } else {
      id = 'phone_type_custom';
      args.type = type;
    }

    if (carrier) {
      id += '_and_carrier';
      args.carrier = carrier;
    }

    return {
      id:   id,
      args: Object.keys(args).length ? args : null
    };
  },

  /**
   * Checks if the passed string is one of the predefined phone types that we
   * localize when displayed.
   *
   * @param {String} type A string representing the phone type
   * @return {Boolean} true if the string is one of the predefined phone types,
   *         false otherwise.
   */
  isPhoneType: function ut_isPhoneType(type) {
    return this._phoneTypesL10n.hasOwnProperty(type);
  }
};

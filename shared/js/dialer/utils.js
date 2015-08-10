'use strict';

/* exported Utils */

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var _ = navigator.mozL10n.get;
    var timeFormat = window.navigator.mozHour12 ? _('shortTimeFormat12') :
                                                  _('shortTimeFormat24');
    var dtf = new navigator.mozL10n.DateTimeFormat();
    return dtf.localeFormat(new Date(time), timeFormat);
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

  headerDate: function ut_headerDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    var diff = (Date.now() - time) / 1000;
    var day_diff = Math.floor(diff / 86400);
    var formattedTime;
    if (isNaN(day_diff)) {
      formattedTime = _('incorrectDate');
    } else if (day_diff === 0) {
      formattedTime = _('today');
    } else if (day_diff === 1) {
      formattedTime = _('yesterday');
    } else if (day_diff < 6) {
      formattedTime = dtf.localeFormat(new Date(time), '%A');
    } else {
      formattedTime = dtf.localeFormat(new Date(time), '%x');
    }
    return formattedTime;
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
   * This function works just like getPhoneNumberAdditionalInfo but returns
   * either an l10n id or an object holding an l10n id & args couple.
   * Eventually getPhoneNumberAdditionalInfo will be removed and entirely
   * replaced by this function.
   */
  getLocalizedPhoneNumberAdditionalInfo:
  function ut_getLocalizedPhoneNumberAdditionalInfo(matchingTel) {
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

    if (Object.keys(args).length === 0) {
      return id;
    } else {
      return {
        id:   id,
        args: args
      };
    }
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

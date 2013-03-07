/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
var _ = navigator.mozL10n.get;
var dtf = new navigator.mozL10n.DateTimeFormat();

(function(exports) {
  var sharedDate = new Date();
  var regexps = {
    amp: /&/g,
    lt: /</g,
    gt: />/g,
    br: /(\r\n|\n|\r)/gm,
    nbsp: /\s\s/g,
    quot: /"/g,
    apos: /'/g
  };

  var Utils = {
    updateTimeHeaders: function ut_updateTimeHeaders() {
      var headers = document.querySelectorAll('header[data-time-update]'),
          length = headers.length,
          i, ts, header, headerDate, formattedHour, newHeader;

      if (length) {
        for (i = 0; i < length; i++) {
          header = headers[i];
          ts = header.dataset.time;
          headerDate = Utils.getHeaderDate(ts);
          formattedHour = Utils.getFormattedHour(ts);

          // only date
          if (header.dataset.isThread) {
            newHeader = headerDate;

          // only time
          } else if (header.dataset.hourOnly) {
            newHeader = formattedHour;

          // date + time
          } else {
            newHeader = headerDate + ' ' + formattedHour;
          }

          if (newHeader !== header.textContent) {
            header.textContent = newHeader;
          }
        }
      }
    },
    startTimeHeaderScheduler: function ut_startTimeHeaderScheduler() {
      this.updateTimeHeaders();
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
      }
      this.updateTimer = setInterval(function(self) {
        self.updateTimeHeaders();
      }, 50000, this);
    },
    escapeHTML: function ut_escapeHTML(str, escapeQuotes) {
      if (typeof str !== 'string') {
        return '';
      }
      // Order is vitally important: ampersands must be converted first
      // to avoid converting the ampersands that prefix an entity later.
      var escaped = str.replace(regexps.amp, '&amp;')
        .replace(regexps.lt, '&lt;')
        .replace(regexps.gt, '&gt;')
        .replace(regexps.br, '<br/>')
        .replace(regexps.nbsp, ' &nbsp;');

      if (escapeQuotes) {
        return escaped
          .replace(regexps.quot, '&quot;')
          .replace(regexps.apos, '&apos;');
      }

      return escaped;
    },

    getFormattedHour: function ut_getFormattedHour(time) {
      sharedDate.setTime(+time);
      return dtf.localeFormat(sharedDate, _('shortTimeFormat'));
    },
    getDayDate: function re_getDayDate(time) {
      sharedDate.setTime(+time);
      sharedDate.setHours(0, 0, 0, 0);
      return sharedDate.getTime();
    },
    getHeaderDate: function ut_giveHeaderDate(time) {
      sharedDate.setTime(+time);
      var today = Utils.getDayDate(Date.now());
      var otherDay = Utils.getDayDate(time);
      var dayDiff = (today - otherDay) / 86400000;

      if (isNaN(dayDiff)) {
        return _('incorrectDate');
      }

      if (dayDiff < 0) {
        // future time
        return dtf.localeFormat(sharedDate, _('shortDateTimeFormat'));
      }

      return dayDiff === 0 && _('today') ||
        dayDiff === 1 && _('yesterday') ||
        dayDiff < 4 && dtf.localeFormat(sharedDate, '%A') ||
        dtf.localeFormat(sharedDate, '%x');
    },
    getFontSize: function ut_getFontSize() {
      if (!this.rootFontSize) {
        var htmlCss = window.getComputedStyle(document.documentElement, null);
        this.rootFontSize = parseInt(htmlCss.getPropertyValue('font-size'), 10);
      }
      return this.rootFontSize;
    },

    getPhoneDetails: function ut_getPhoneDetails(number, contact, callback) {
      var details = {},
          name, phone, carrier, i, length, subscriber;

      if (contact) {
        name = contact.name[0];
        phone = contact.tel[0],
        carrier = phone.carrier;
        length = contact.tel.length;
        subscriber = number.length > 7 ? number.substr(-8) : number;

        // Check which of the contacts phone number are we using
        for (i = 0; i < length; i++) {
          // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
          if (contact.tel[i].value.indexOf(subscriber) !== -1) {
            phone = contact.tel[i];
            carrier = phone.carrier;
            break;
          }
        }

        // Add data values for contact activity interaction
        details.isContact = true;

        // Add photo
        if (contact.photo && contact.photo[0]) {
          details.photoURL = URL.createObjectURL(contact.photo[0]);
        }

        // Carrier logic
        if (name) {
          // Check if other phones with same type and carrier
          for (i = 0; i < length; i++) {
            if (contact.tel[i].value !== phone.value &&
                contact.tel[i].type === phone.type &&
                contact.tel[i].carrier === phone.carrier) {
              carrier = phone.value;
            }
          }
        }

        details.title = name || number;
        details.carrier = carrier || phone.value || '';

        if (phone.type) {
          details.carrier = phone.type + ' | ' + details.carrier;
        }

      // No contact argument was provided
      } else {
        details.title = number;
      }

      callback(details);
    }
  };

  exports.Utils = Utils;

}(this));

/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Based on Resig's pretty date
var _ = navigator.mozL10n.get;
var dtf = new navigator.mozL10n.DateTimeFormat();

var Utils = {
  updateTimeHeaders: function ut_updateTimeHeaders() {
    var elementsToUpdate =
        document.querySelectorAll('header[data-time-update]');
    if (elementsToUpdate.length > 0) {
      for (var i = 0; i < elementsToUpdate.length; i++) {
        var ts = elementsToUpdate[i].dataset.time;
        var tmpHeaderDate;
        if (elementsToUpdate[i].dataset.isThread) { // only date
          tmpHeaderDate = Utils.getHeaderDate(ts);
        } else {
          elementsToUpdate[i].dataset.hourOnly ?
            tmpHeaderDate = Utils.getFormattedHour(ts) : // only time
            tmpHeaderDate = Utils.getHeaderDate(ts) + ' ' +
                            Utils.getFormattedHour(ts); // date + time
        }
        var currentHeader = elementsToUpdate[i].innerHTML;
        if (tmpHeaderDate != currentHeader) {
          elementsToUpdate[i].innerHTML = tmpHeaderDate;
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
    var stringHTML = str;
    stringHTML = stringHTML.replace(/\</g, '&#60;');
    stringHTML = stringHTML.replace(/(\r\n|\n|\r)/gm, '<br/>');
    stringHTML = stringHTML.replace(/\s\s/g, ' &nbsp;');

    if (escapeQuotes)
      return stringHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    return stringHTML;
  },

  getFormattedHour: function ut_getFormattedHour(time) {
    switch (time.constructor) {
      case String:
        time = parseInt(time);
        break;
      case Date:
        time = time.getTime();
        break;
    }

    return dtf.localeFormat(new Date(time), _('shortTimeFormat'));
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
    var today = Utils.getDayDate((new Date()).getTime());
    var otherDay = Utils.getDayDate(time);
    var dayDiff = (today - otherDay) / 86400000;

    if (isNaN(dayDiff))
      return _('incorrectDate');

    if (dayDiff < 0) {
      // future time
      return dtf.localeFormat(new Date(time), _('shortDateTimeFormat'));
    }

    return dayDiff == 0 && _('today') ||
      dayDiff == 1 && _('yesterday') ||
      dayDiff < 4 && dtf.localeFormat(new Date(time), '%A') ||
      dtf.localeFormat(new Date(time), '%x');
  },
  getFontSize: function ut_getFontSize() {
    if (!this.rootFontSize) {
      var htmlCss = window.getComputedStyle(document.documentElement, null);
      this.rootFontSize = parseInt(htmlCss.getPropertyValue('font-size'));
    }
    return this.rootFontSize;
  },

  getPhoneDetails: function ut_getPhoneDetails(number, contact, callback) {
    var details = {};
    if (contact) { // we have a contact
      var name = contact.name,
          phone = contact.tel[0],
          carrierToShow = phone.carrier;

      // Check which of the contacts phone number are we using
      for (var i = 0; i < contact.tel.length; i++) {
        // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
        var tempPhoneNumber = contact.tel[i].value;
        if (number.length > 7) {
          var rootPhoneNumber = number.substr(-8);
        } else {
          var rootPhoneNumber = number;
        }
        if (tempPhoneNumber.indexOf(rootPhoneNumber) != -1) {
          phone = contact.tel[i];
          carrierToShow = phone.carrier;
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
      if (name && name != '') { // contact with name
        // Check if other phones with same type and carrier
        for (var i = 0; i < contact.tel.length; i++) {
          if (contact.tel[i].value !== phone.value &&
              contact.tel[i].type == phone.type &&
              contact.tel[i].carrier == phone.carrier) {
            carrierToShow = phone.value;
          }
        }
        details.title = name;
        details.carrier = (carrierToShow || phone.value);
      } else { // no name of contact
        details.title = number;
        details.carrier = (phone.carrier || '');
      }

      if (phone.type) {
        details.carrier = phone.type + ' | ' + details.carrier;
      }

    } else { // we don't have a contact
      details.title = number;
    }
    callback(details);
  }
};

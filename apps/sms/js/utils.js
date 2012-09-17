/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Based on Resig's pretty date
var _ = navigator.mozL10n.get;
var dtf = new navigator.mozL10n.DateTimeFormat();

var Utils = {
  updateHeaders: function ut_updateHeaders() {
    var elementsToUpdate =
        document.querySelectorAll('h2[data-time-update]');
    if (elementsToUpdate.length > 0) {
      for (var i = 0; i < elementsToUpdate.length; i++) {
        var ts = elementsToUpdate[i].getAttribute('data-time');
        var tmpHeaderDate = Utils.getHeaderDate(ts);
        var currentHeader = elementsToUpdate[i].innerHTML;
        if (tmpHeaderDate != currentHeader) {
          elementsToUpdate[i].innerHTML = tmpHeaderDate;
        }
      }
    } else {
      clearInterval(Utils.updateTimer);
      Utils.updating = false;
    }
  },
  updateHeaderScheduler: function ut_updateHeaderScheduler() {
    if (!Utils.updating) {
      Utils.updating = true;
      Utils.updateHeaders();
      Utils.updateTimer = setInterval(function() {
        Utils.updateHeaders();
      },5000);
    }
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

  getHourMinute: function ut_getHourMinute(time) {
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
      //TODO what if there are more contacts?
      var name = contact.name,
          phone = contact.tel[0],
          carrierToShow = phone.carrier;

      // Check which of the contacts phone number are we using
      for (var i = 0; i < contact.tel.length; i++) {
        if (contact.tel[i].value == number) {
          phone = contact.tel[i];
          carrierToShow = phone.carrier;
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
        details.carrier = phone.type + ' | ' +
                          (carrierToShow || phone.value);
      } else { // no name of contact
        details.title = number;
        details.carrier = phone.type + ' | ' + (phone.carrier || '');
      }

    } else { // we don't have a contact
      details.title = number;
    }
    callback(details);
  }
};

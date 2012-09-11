/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Based on Resig's pretty date
var _ = navigator.mozL10n.get;

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

    return (new Date(time)).toLocaleFormat('%R %p');
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
      return (new Date(time)).toLocaleFormat('%x %R');
    }

    return dayDiff == 0 && _('today') ||
      dayDiff == 1 && _('yesterday') ||
      dayDiff < 4 && (new Date(time)).toLocaleFormat('%A') ||
      (new Date(time)).toLocaleFormat('%x');
  },
  getFontSize: function ut_getFontSize() {
    if (!this.rootFontSize) {
      var htmlCss = window.getComputedStyle(document.documentElement, null);
      this.rootFontSize = parseInt(htmlCss.getPropertyValue('font-size'));
    }
    return this.rootFontSize;
  },

  getPhoneDetails: function ut_getPhoneDetails(number, callback) {
    ContactDataManager.getContactData(number, function gotContact(contact) {
      var details = {};
      //TODO what if return multiple contacts?
      if (contact.length > 0) { // we have a contact
        var name = contact[0].name,
            phone = contact[0].tel[0],
            carrierToShow = phone.carrier;
        // Check which of the contacts phone number we are using
        for (var i = 0; i < contact[0].tel.length; i++) {
          if (contact[0].tel[i].value == number) {
            phone = contact[0].tel[i];
            carrierToShow = phone.carrier;
          }
        }
        // Add data values for contact activity interaction
        details.isContact = true;

        if (name && name != '') { // contact with name
          // Check if other phones with same type and carrier
          for (var i = 0; i < contact[0].tel.length; i++) {
            if (contact[0].tel[i].value !== phone.value &&
                contact[0].tel[i].type == phone.type &&
                contact[0].tel[i].carrier == phone.carrier) {
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
    });
  }
};

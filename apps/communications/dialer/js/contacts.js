/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Contacts = {
  findByNumber: function findByNumber(number, callback) {
    var options;
    var variants;

    // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
    // if length < 7 we're dealing with a short number
    // so no need for variants
    if (number.length < 7) {
      variants = [number];
      options = {
        filterBy: ['tel'],
        filterOp: 'equals',
        filterValue: number
      };
    } else {
      // get the phone number variants
      variants = SimplePhoneMatcher.generateVariants(number);

      options = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: variants[0] // matching the shortest variant
      };
    }


    var mozContacts = navigator.mozContacts;
    if (!mozContacts)
      callback(null);

    var request = mozContacts.find(options);
    request.onsuccess = function findCallback() {
      if (request.result.length === 0) {
        callback(null);
        return;
      }

      // formatting the matches as an array (contacts) of arrays (phone numbers)
      var matches = request.result.map(function getTels(contact) {
        return contact.tel.map(function getNumber(tel) {
          return tel.value;
        });
      });

      // Finding the best match
      var matchResult = SimplePhoneMatcher.bestMatch(variants, matches);

      var contact = request.result[matchResult.bestMatchIndex];

      if (request.result.length > 1) {
        var name = contact.name[0].substring(0, 8),
            numOfothers = request.result.length - 1;
        contact.name[0] = _('lineContactName', {name: name, n: numOfothers});
      }

      var matchingTel = contact.tel[matchResult.localIndex];
      callback(contact, matchingTel);
    };
    request.onerror = function findError() {
      callback(null);
    };
  }
};

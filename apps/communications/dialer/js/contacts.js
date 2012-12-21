/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var fbContacts = {};

// Searcher object for FB Data
var _FbDataSearcher = function(variants) {
  var pointer = 0;
  var self = this;
  this.variants = variants;

  window.console.log('Num Variants ', variants.length);

  function checkVariant(variant, successCb, notFoundCb) {
    fb.getContactByNumber(variant, function success(result) {
      var contact = result;

      if (contact) {
        fb.utils.getMozContactByUid(contact.uid, function merge(e) {
          var devContact = e.target.result[0];
          var finalContact = fb.mergeContact(devContact, contact);
          successCb(finalContact, {
            value: variant,
            // Facebook telephone are always of type personal
            type: 'personal',
            // We don't know the carrier from FB phones
            carrier: null
          });
        }, function error_get_mozContact() {
            console.error('Error getting mozContact');
            notFoundCb();
        });
      }
      else {
        notFoundCb();
      }
    }, function error_getContactByNumber() {
        console.error('Error getting FB contacts');
        notFoundCb();
    });
  }

  function successCb(fbContact, matchingTel) {
    self.onsuccess(fbContact, matchingTel);
  }

  function notFoundCb() {
    pointer++;
    if (pointer < self.variants.length) {
      window.console.log('******* Checking variant *****', pointer);
      check(self.variants[pointer]);
    }
    else {
      self.onNotFound();
    }
  }

  function check(variant) {
    checkVariant(variant, successCb, notFoundCb);
  }

  this.start = function() {
    check(self.variants[0]);
  };

};

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
        // Checking if FB is enabled or not
        window.asyncStorage.getItem('tokenData', function(data) {
          if (!data || !data.access_token) {
            // Facebook is not even enabled
            callback(null);
            return;
          }

          // Searching each variant on the fbContacts cache
          var searcher = new _FbDataSearcher(variants);
          searcher.start();
          searcher.onsuccess = callback;
          searcher.onNotFound = function not_found() {
            callback(null);
          };
        });

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
      var contactsWithSameNumber;
      if (request.result.length > 1) {
        contactsWithSameNumber = request.result.length - 1;
      }

      var matchingTel = contact.tel[matchResult.localIndex];
      if (fb.isFbLinked(contact)) {
        // Merge with the FB data
        var req = fb.contacts.get(fb.getFriendUid(contact));
        req.onsuccess = function() {
          callback(fb.mergeContact(contact, req.result), matchingTel,
            contactsWithSameNumber);
        };
        req.onerror = function() {
          window.console.error('Error while getting FB Data');
          callback(contact, matchingTel, contactsWithSameNumber);
        };
      }
      else {
        callback(contact, matchingTel, contactsWithSameNumber);
      }
    };
    request.onerror = function findError() {
      callback(null);
    };
  }
};

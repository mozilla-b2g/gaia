/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Contacts = {

  _FB_FILES: [
    '/shared/js/fb/fb_request.js',
    '/shared/js/fb/fb_data_reader.js',
    '/shared/js/fb/fb_reader_utils.js'
  ],

  // The mozContact API stores a revision of its database that allow us to know
  // if we have a proper and updated contact cache.
  getRevision: function getRevision(callback) {
    var mozContacts = navigator.mozContacts;
    if (!mozContacts) {
      callback(null);
      return;
    }

    var req = mozContacts.getRevision();
    req.onsuccess = function onsuccess(event) {
      callback(event.target.result);
    };
    req.onerror = function onerror(event) {
      console.log('Error ' + event.target.error);
      callback(null);
    };
  },

  findByNumber: function findByNumber(number, callback) {
    LazyLoader.load(this._FB_FILES,
                    this._findByNumber.bind(this, number, callback));
  },

  _findByNumber: function _findByNumber(number, callback) {
    if (!number) {
      callback(null);
      return;
    }

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
      // get the phone number variants (for the Facebook lookup)
      variants = SimplePhoneMatcher.generateVariants(number);
      var sanitizedNumber = SimplePhoneMatcher.sanitizedNumber(number);

      options = {
        filterBy: ['tel'],
        filterOp: 'match',
        filterValue: sanitizedNumber
      };
    }

    var mozContacts = navigator.mozContacts;
    if (!mozContacts) {
      callback(null);
      return;
    }

    var request = mozContacts.find(options);
    request.onsuccess = function findCallback() {
      var contacts = request.result;
      if (contacts.length === 0) {
        // Checking if FB is enabled or not
        window.asyncStorage.getItem('tokenData', function(data) {
          if (!data || !data.access_token) {
            // Facebook is not even enabled
            callback(null);
            return;
          }

          // It is only necessary to search for one variant as FB takes care
          fb.getContactByNumber(number, function fb_ready(finalContact) {
              var objMatching = null;
              if (finalContact) {
                objMatching = {
                  value: number,
                  // Facebook telephone are always of type personal
                  type: 'personal',
                  // We don't know the carrier from FB phones
                  carrier: null
                };
              }
              callback(finalContact, objMatching);
            }, function fb_err(err) {
                callback(null);
            });
          });
        return;
      }

      // formatting the matches as an array (contacts) of arrays (phone numbers)
      var matches = contacts.map(function getTels(contact) {
        return contact.tel.map(function getNumber(tel) {
          return tel.value;
        });
      });

      // Finding the best match
      var matchResult = SimplePhoneMatcher.bestMatch(variants, matches);

      var contact = contacts[matchResult.bestMatchIndex];
      var contactsWithSameNumber;
      if (contacts.length > 1) {
        contactsWithSameNumber = contacts.length - 1;
      }

      var matchingTel = contact.tel[matchResult.localIndex];
      if (fb.isFbLinked(contact)) {
        // Merge with the FB data
        var req = fb.getData(contact);
        req.onsuccess = function() {
          callback(req.result, matchingTel, contactsWithSameNumber);
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
  },

  _mergeFbContacts: function _mergeFbContacts(contacts, callback) {
    if (!callback || !(callback instanceof Function)) {
      return;
    }

    if (!contacts) {
      callback(null);
    }

    LazyLoader.load(this._FB_FILES, function() {
      for (var i = 0, length = contacts.length; i < length; i++) {
        if (fb.isFbContact(contacts[i])) {
          var fbReq = fb.getData(contacts[i]);
          fbReq.onsuccess = function() {
            contacts[i] = fbReq.result;
            if (i === (length - 1)) {
              callback(contacts);
            }
          };
          fbReq.onerror = function() {
            console.error('Could not merge Facebook data');
            callback(contacts);
          };
        } else if (i === (length - 1)) {
          callback(contacts);
        }
      }
    });
  },

  _findContacts: function _findContacts(options, callback) {
    if (!callback || !(callback instanceof Function)) {
      return;
    }

    if (!navigator.mozContacts || !options) {
      callback(null);
      return;
    }

    var self = this;
    var req = navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      var contacts = req.result;
      if (!contacts.length) {
        callback(null);
        return;
      }

      // If we have contacts data from Facebook, we need to merge it with the
      // one from the Contacts API db.
      window.asyncStorage.getItem('tokenData', function(data) {
        if (data && data.access_token) {
          self._mergeFbContacts(contacts, callback);
        } else {
          callback(contacts);
        }
      });
    };

    req.onerror = function onerror() {
      console.error('Contact finding error. Error: ' + req.errorCode);
      callback(null);
    };
  },

  findListByNumber: function findListByNumber(number, limit, callback) {
    var self = this;
    asyncStorage.getItem('order.lastname', function(value) {
      var sortKey = value ? 'familyName' : 'givenName';

      var options = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: number,
        sortBy: sortKey,
        sortOrder: 'ascending',
        filterLimit: limit
      };

      self._findContacts(options, callback);
    });
  }
};

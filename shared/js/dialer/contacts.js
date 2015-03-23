/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Contacts = {

  _FB_FILES: [
    '/shared/js/fb/fb_request.js',
    '/shared/js/fb/fb_data_reader.js',
    '/shared/js/fb/fb_reader_utils.js'
  ],

  _calledNumberCache: [],

  _CACHE_SIZE: 10,

  init: function init() {
    var self = this;
    var mozContacts = window.navigator.mozContacts;

    asyncStorage.getItem('contactsCache', function (value) {
      if(value) {
        self._calledNumberCache = JSON.parse(value);
      }
    });

    if (mozContacts) {
      LazyLoader.load(self._FB_FILES, function() {
        mozContacts.oncontactchange = self._oncontactchange.bind(self);
      });
    }
  },

  _calledNumberCachePush: function (number, contact, matchingTel) {
    if (this._calledNumberCache.length > this._CACHE_SIZE) {
      this._calledNumberCache.shift();
    }

    this._calledNumberCache.push({
      id: (contact ? contact.id : null),
      number: number,
      contact: contact,
      matchingTel: matchingTel
    });

    var self = this;
    setTimeout(function () {
      asyncStorage.setItem('contactsCache', JSON.stringify(self._calledNumberCache));
    },0);
  },

  _calledNumberCacheGet: function (number) {
    for (var i = 0; i < this._CACHE_SIZE; i++) {
      if (this._calledNumberCache[i]) {
        if (number === this._calledNumberCache[i].number) {
        return this._calledNumberCache[i];
        }
      }
    }
    return null;
  },

  _oncontactchange: function _oncontactchange(event) {
    var self = this;
    var reason = event.reason;
    var contactID = event.contactID;
    // Mark if the local cache has been modified on the event or not
    var isCacheUpdated = false;
    // To store the cache index should be deleted on the event and then remove
    // it from cache after the traversal finished.
    var tempDeletedIndex = null;

    function calledNumberCacheUpdate(contact, reason) {
      self._calledNumberCache.forEach(function(cachedContact, index) {
        var isMatched = false;

        // Update the cache if all of the following conditions satisfied:
        // 1) reason is 'create' or 'update'
        // 2) cached number equals to the contact's
        // 3) cached id is null or cached id equals to the contact's
        if (contact && contact.tel &&
            (reason === 'create' || reason === 'update')) {
          isMatched = contact.tel.some(function(tel) {
            if (tel.value === cachedContact.number &&
                (!cachedContact.id || cachedContact.id === contactID)) {
              cachedContact.id = contactID;
              cachedContact.contact = contact;
              cachedContact.matchingTel = tel;
              return true;
            }
            return false;
          });
        }

        // Delete from cache after the traversal if either satisfied:
        // 1) reason is 'remove' and cached id equals to the contact's
        // 2) reason is 'update' and its number's been changed for the same id
        if (!isMatched && cachedContact.id === contactID) {
          isMatched = true;
          tempDeletedIndex = index;
          cachedContact.contact = null;
          cachedContact.matchingTel = null;
        }

        // Only modify as true when matched between cache and the contact
        isCacheUpdated = isMatched || isCacheUpdated;
      });

      if (tempDeletedIndex !== null) {
        self._calledNumberCache.splice(tempDeletedIndex, 1);
        tempDeletedIndex = null;
      }

      if (isCacheUpdated) {
        setTimeout(function () {
          asyncStorage.setItem('contactsCache', JSON.stringify(self._calledNumberCache));
        },0);
      }
    }

    if (reason === 'remove') {
      calledNumberCacheUpdate(null, 'remove');
      return;
    }

    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: contactID
    };

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function contactRetrieved(e) {
      if (!e.target.result || e.target.result.length === 0) {
        console.warn('sharedContacts: No Contact Found: ', contactID);
        return;
      }

      var contact = e.target.result[0];
      if (!fb.isFbContact(contact)) {
         calledNumberCacheUpdate(contact, reason);
         return;
      }

      var fbReq = fb.getData(contact);
      fbReq.onsuccess = function fbContactSuccess() {
        calledNumberCacheUpdate(fbReq.result, reason);
      };
      fbReq.onerror = function fbContactError() {
        console.error('sharedContacts: Query FB error:', fbReq.error.name);
        calledNumberCacheUpdate(contact, reason);
      };
    };

    request.onerror = function errorHandler(e) {
      console.error('sharedContacts: request error by ID:' + contactID);
    };
  },

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

    var cachedContact = this._calledNumberCacheGet(number);
    if (cachedContact) {
      callback(cachedContact.contact, cachedContact.matchingTel);
      return ;
    }

    var options;
    var variants;
    var self = this;

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

          self._calledNumberCachePush(number, finalContact, objMatching);
          callback(finalContact, objMatching);
        }, function fb_err(err) {
          callback(null);
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
          self._calledNumberCachePush(number, req.result, matchingTel);
          callback(req.result, matchingTel, contactsWithSameNumber);
        };
        req.onerror = function() {
          window.console.error('Error while getting FB Data');
          self._calledNumberCachePush(number, contact, matchingTel);
          callback(contact, matchingTel, contactsWithSameNumber);
        };
      }
      else {
        self._calledNumberCachePush(number, contact, matchingTel);
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
      self._mergeFbContacts(contacts, callback);
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
  },

  getLength: function getLength(prop) {
    if (!prop || !prop.length) {
      return 0;
    }
    return prop.length;
  },

  sendEmailOrPick: function sendEmailOrPick(address) {
    try {
      // We don't check the email format, lets the email
      // app do that
      new MozActivity({
        name: 'new',
        data: {
          type: 'mail',
          URI: 'mailto:' + address
        }
      });
    } catch (e) {
      console.error('WebActivities unavailable? : ' + e);
    }
  }
};

window.addEventListener('load', function onLoad(event) {
  window.removeEventListener('load', onLoad);
  Contacts.init();

  window.LazyL10n.get(function loadLazyFilesSet() {
    console.log('moz1117450 --- LazyL10n is loaded.');
  });
});
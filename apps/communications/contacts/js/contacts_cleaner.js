'use strict';

window.ContactsCleaner = function(contacts) {
  this.lcontacts = contacts;
  var total = contacts.length;
  var next = 0;
  var self = this;
  var CHUNK_SIZE = 5;
  var numResponses = 0;
  var notifyClean = false;

  var mustHold = false;
  var holded = false;
  var mustFinish = false;

  this.start = function() {
    mustHold = holded = mustFinish = false;

    if (total > 0) {
      cleanContacts(0);
    }
    else if (typeof self.onsuccess === 'function') {
            window.setTimeout(self.onsuccess, 0);
    }
  };

  this.hold = function() {
    mustHold = true;
  };

  this.finish = function() {
    mustFinish = true;

    if (holded) {
      notifySuccess();
    }
  };

  this.resume = function() {
    mustHold = holded = mustFinish = false;

    window.setTimeout(function resume_clean() {
      cleanContacts(next);
    });
  };

  this.performClean = function(contact, number, cbs) {
    var theContact = (contact instanceof mozContact) ?
                     contact : new mozContact(contact);
    var req = navigator.mozContacts.remove(theContact);
    req.number = number;
    req.onsuccess = cbs.success;
    req.onerror = function(e) {
      errorHandler(contact.id, e.target.error);
    };
  };

  function successHandler(e) {
    if (notifyClean || typeof self.oncleaned === 'function') {
      notifyClean = true;
      // Avoiding race condition so the cleaned element is cached
      var cleaned = e.target.number;
      window.setTimeout(function() {
        self.oncleaned(cleaned);
      },0);
    }
    continueCb();
  }

  function errorHandler(contactid, error) {
    if (typeof self.onerror === 'function') {
      self.onerror(contactid, error);
    }

    continueCb();
  }

  function cleanContacts(from) {
    for (var idx = from; idx < (from + CHUNK_SIZE) && idx < total; idx++) {
      var contact = contacts[idx];
      self.performClean(contact, idx, {
        success: successHandler
      });
    }
  }

  function notifySuccess() {
    if (typeof self.onsuccess === 'function') {
      window.setTimeout(self.onsuccess);
    }
  }

  function continueCb() {
    next++;
    numResponses++;
    if (next < total && numResponses === CHUNK_SIZE) {
      numResponses = 0;
      if (!mustHold && !mustFinish) {
        cleanContacts(next);
      }
      else if (mustFinish && !holded) {
        notifySuccess();
      }

      if (mustHold) {
        holded = true;
      }
    }
    else if (next >= total) {
      // End has been reached
      notifySuccess();
    }
  } // function
}; // ContactsCleaner

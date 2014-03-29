/* globals fb */
/* exported contactsRemover */
'use strict';

/*
 * Contacts Remover delete the contacts present in phone.
 *   - start: To initiate the deleting process.
 *   - finish: To cancel the deleting process.
 *   - onDeleted: A Contact has been deleted
 *   - onFinished: All Selected contacts have been deleted;
 *   - onError: Error while deleting contacts.
 */

function contactsRemover() {

  var totalRemoved = 0;
  var totalSelected = 0;
  var cancelled = false;
  /*jshint validthis:true */
  var self = this;
  var contacts;

  this.init = function(pcontacts, cb) {
    if (pcontacts === null || pcontacts.length === 0) {
      return;
    }
    contacts = pcontacts;
    cb();
  };

  this.start = function() {
    totalRemoved = 0;
    cancelled = false;
    totalSelected = contacts.length;
    continueCb(contacts);
  };

  this.finish = function() {
    cancelled = true;
  };

  this.getDeletedCount = function() {
    return totalRemoved;
  };

  function continueCb(contacts) {
    var currentContact = contacts.shift();
    if (!currentContact || cancelled) {
      if (totalRemoved === totalSelected) {
        notifyFinished();
      }
      else {
        notifyCancelled();
      }
      return;
    }
    var request = deleteContact(currentContact);
    request.onSuccess = function() {
      totalRemoved++;
      notifyDeleted(currentContact);
      continueCb(contacts);
    };
    request.onError = function() {
      notifyError();
    };
  }

  function notifyError() {
    if (typeof self.onError === 'function') {
      self.onError();
    }
  }

  function notifyCancelled() {
    if (typeof self.onCancelled === 'function') {
      window.setTimeout(self.onCancelled, 100);
    }
  }

  function notifyFinished() {
    if (typeof self.onFinished === 'function') {
      window.setTimeout(self.onFinished, 100);
    }
  }

  function notifyDeleted(currentContact) {
    if (typeof self.onDeleted === 'function') {
      self.onDeleted(currentContact);
    }
  }

  function deleteContact(contact) {
    var request;
    var outreq = {onSuccess: null, onError: null};

    if (fb.isFbContact(contact)) {
      var fbContact = new fb.Contact(contact);
      request = fbContact.remove();
    } else {
      request = navigator.mozContacts.remove(contact);
    }
    request.onsuccess = function() {
      outreq.onSuccess();
    };
    request.onerror = function() {
      outreq.onError();
    };
    return outreq;
  }
}

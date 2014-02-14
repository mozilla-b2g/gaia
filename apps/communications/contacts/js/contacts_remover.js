/* globals mozContact, fb */
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
  var ids;

  this.init = function(cIds, cb) {
    if (cIds === null || cIds.length === 0) {
      return;
    }
    ids = cIds;
    cb();
  };

  this.start = function() {
    totalRemoved = 0;
    cancelled = false;
    totalSelected = ids.length;
    continueCb(ids);
  };

  this.finish = function() {
    cancelled = true;
  };

  this.getDeletedCount = function() {
    return totalRemoved;
  };

  function continueCb(ids) {
    var currentId = ids.shift();
    if (!currentId || cancelled) {
      if (totalRemoved === totalSelected) {
        notifyFinished();
      }
      else {
        notifyCancelled();
      }
      return;
    }
    var request = deleteContact(currentId);
    request.onSuccess = function() {
      totalRemoved++;
      notifyDeleted(currentId);
      continueCb(ids);
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

  function notifyDeleted(currentId) {
    if (typeof self.onDeleted === 'function') {
      self.onDeleted(currentId);
    }
  }

  function deleteContact(currentID) {
    var request;
    var outreq = {onSuccess: null, onError: null};
    var contact = new mozContact();
    contact.id = currentID;

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

window.contactsRemover = contactsRemover;

/* globals mozContact, fb, ContactsService */
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
  var fbData = Object.create(null);

  this.init = function(cIds, cb) {
    if (cIds === null || cIds.length === 0) {
      return;
    }
    ids = cIds;

    // In order to properly delete FB Contacts we need to obtain their data
    // Take into account that we are querying all FB Contacts but we don't know
    // beforehand if there will be any of them to be deleted
    var req = fb.utils.getAllFbContacts();
    req.onsuccess = function() {
      var fbContacts = req.result;
      fbContacts.forEach(function(aFbContact) {
        fbData[aFbContact.id] = aFbContact;
      });
      cb();
    };
    req.onerror = function() {
      console.error('Error while retrieving FB Contacts: ', req.error.name);
      cb();
    };
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

    deleteContact(
      currentId,
      function(e) {
        if (e) {
          notifyError();
          return;
        }
        totalRemoved++;
        notifyDeleted(currentId);
        continueCb(ids);
      }
    );
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

  function deleteContact(currentID, callback) {
    var contact = new mozContact();
    contact.id = currentID;

    ContactsService.remove(
      contact,
      callback
    );
  }
}

window.contactsRemover = contactsRemover;

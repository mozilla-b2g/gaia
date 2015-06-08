'use strict';

/* global mozContact, threads */

function toMozContact(contact) {
  var outContact = contact;
  if (!(contact instanceof mozContact)) {
    outContact = new mozContact(contact);
    outContact.id = contact.id || outContact.id;
  }
  return outContact;
}

function deserialize(serializedContact) {
  var contact = JSON.parse(serializedContact);
  if (contact.updated) {
    contact.updated = new Date(contact.updated);
  }
  if (contact.published) {
    contact.published = new Date(contact.published);
  }
  contact = toMozContact(contact);
  return contact;
}

var service, _clientID;

function dispatchEvent(e) {
  service.broadcast(
    e.type,
    // We need to stringify the event
    JSON.stringify({
      reason: e.reason,
      type: e.type,
      contactID: e.contactID
    }),
    [_clientID]
  );
}

service = threads.service('contacts-service')
  .method('register', function(clientID) {
    _clientID = clientID;
  })
  .method('addListener', function(event) {
    navigator.mozContacts.addEventListener(event, dispatchEvent);
  })
  .method('removeListener', function(event) {
    navigator.mozContacts.removeEventListener(event, dispatchEvent);
  })
  .method('isEmpty', function() {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozContacts.getCount();
      req.onsuccess = function() {
        resolve(req.result === 0);
      };

      req.onerror = function() {
        reject(new Error('Error while retrieving the number of Contacts'));
      };
    });
  })
  .method('get', function(uuid) {
    return new Promise(function(resolve, reject) {
      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: uuid
      };

      var request = navigator.mozContacts.find(options);

      request.onsuccess = function onsuccess(e) {
        var contact = e.target.result[0];
        if (!contact) {
          reject();
          return;
        }
        // We need to serialize due to Threads.js
        resolve(JSON.stringify(contact));
      };

      request.onerror = reject;
    });
  })
  .method('remove', function(contact) {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozContacts.remove(deserialize(contact));
      req.onsuccess = function() {
        resolve();
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  })
  .method('save', function(contact) {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozContacts.save(deserialize(contact));
      req.onsuccess = function() {
        resolve();
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  })
  .method('getAll', function() {
    return new Promise(function(resolve, reject) {
      var request = navigator.mozContacts.find({});
      request.onsuccess = function onSuccess() {
        resolve(request.result);
      };
      request.onerror = function onError() {
        reject(new Error('mozContacts.find for retrieving all dont work'));
      };
    });
  })
  .stream('getStreamed', function(stream, sortBy) {
    var options = {
      sortBy: sortBy,
      sortOrder: 'ascending'
    };

    var cursor = navigator.mozContacts.getAll(options);
    cursor.onsuccess = function onsuccess(evt) {
      var contact = evt.target.result;
      if (!contact) {
        stream.close();
        return;
      }
      // We need to serialize due to Threads.js
      stream.write(JSON.stringify(contact));
      cursor.continue();
    };

    cursor.onerror = function onerror(error) {
      console.log('ERROR ' + JSON.stringify(error));
    };
  });

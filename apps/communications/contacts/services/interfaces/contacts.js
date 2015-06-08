(function(exports) {

  /* global fb, utils, threads */
  /* exported ContactsService*/

  'use strict';

  /*
   * Currently we are going to expose all functionality related with
   * mozContacts API through a common interface.
   *
   * In the near future, all these code will expose the same
   * functionality, but we will use Threads.js instead.
   *
   */


  function deserialize(serializedContact) {
    var contact = JSON.parse(serializedContact);
    if (contact.updated) {
      contact.updated = new Date(contact.updated);
    }
    if (contact.published) {
      contact.published = new Date(contact.published);
    }
    contact = utils.misc.toMozContact(contact);
    return contact;
  }

  // Connect with our 'service' of contacts.
  var contactsService = threads.client('contacts-service');
  contactsService.method('register', contactsService.id);

  // All events based on mozConcacts will be handled by this var
  var events = {};

  // Execute all handlers based on an event type
  function executeHandlers(e) {
    // Deserialize due to Threads.js
    e = JSON.parse(e);
    var handlers = events[e.type];
    if (!handlers) {
      return;
    }
    for (var i = 0; i < handlers.length; i++) {
      handlers[i](e);
    }
  }

  function registerListeners(event) {
    contactsService.method('addListener', event, contactsService.id);
    contactsService.on(event, executeHandlers);
  }

  function unregisterListeners(event) {
    contactsService.method('removeListener', event);
  }

  var ContactsService = {
    addListener: function(event, handler) {
      if (!events[event]) {
        events[event] = [handler];
        registerListeners(event);
      } else {
        events[event].push(handler);
      }
    },
    removeListener: function(event, handler) {
      var handlers = events[event];
      if (!handlers || handlers.length === 0) {
        return;
      }

      for (var i = 0; i < handlers.length; i++) {
        if (handlers[i] === handler) {
          handlers.splice(i, 1);
          break;
        }
      }

      handlers = events[event];
      if (handlers.length === 0) {
        unregisterListeners(event);
        delete handlers[event];
      }
    },
    isEmpty: function(callback) {
      contactsService.method('isEmpty')
        .then(function(isEmpty) {
          callback(null, isEmpty);
        })
        .catch(function(e) {
          callback(e);
        });
    },
    save: function(contact, callback) {
      contactsService.method('save', JSON.stringify(contact))
        .then(function() {
          callback();
        })
        .catch(function(e) {
          callback(e);
        });
    },
    remove: function(contact, callback) {
      if (fb.isFbContact(contact)) {
        var fbContact = new fb.Contact(contact);
        var request = fbContact.remove(true);
        request.onsuccess = function() {
          callback();
        };
        request.onerror = function() {
          callback(new Error('mozContact.remove was not'));
        };
      } else {
        contactsService.method('remove', JSON.stringify(contact))
          .then(function() {
            callback();
          })
          .catch(function(e) {
            callback(e);
          });
      }
    },
    get: function(contactID, successCb, errorCb) {
      if (!contactID) {
        successCb();
        return;
      }
      contactsService.method('get', contactID)
        .then(function(serializedContact) {
          // We need to de-serialize due to Threads.js
          var contact = deserialize(serializedContact);

          if (!fb.isFbContact(contact)) {
            successCb(contact);
            return;
          }
          var fbContact = new fb.Contact(contact);
          var fbReq = fbContact.getData();
          fbReq.onsuccess = function() {
            successCb(contact, fbReq.result);
          };
          fbReq.onerror = successCb.bind(null, contact);
        })
        .catch(function(e) {
          if (typeof errorCb === 'function') {
            errorCb(e);
          }
        });
    },
    getAll: function(callback) {
      if (typeof callback !== 'function') {
        return;
      }

      contactsService.method('isEmpty')
        .then(function(contacts) {
          callback(null, contacts);
        })
        .catch(function(e) {
          callback(e);
        });
    },
    getAllStreamed: function(sortBy, onContactCB, onErrorCB, onCompleteCB) {
      // Ensure all callbacks are available
      if (typeof onContactCB !== 'function') {
        onContactCB = function() {};
      }

      if (typeof onErrorCB !== 'function') {
        onErrorCB = function() {};
      }

      if (typeof onCompleteCB !== 'function') {
        onCompleteCB = function() {};
      }

      var stream = contactsService.stream('getStreamed', sortBy);

      // Called every time the service sends a contact
      stream.listen(function(serializedContact) {
        var contact = deserialize(serializedContact);
        onContactCB(contact);
      });

      // "closed" is a Promise that will be fullfilled when stream is
      //closed with success or rejected when the service "abort" the
      // operation
      stream.closed.then(function onStreamClose() {
        onCompleteCB();
      }, function onStreamAbort() {
        onErrorCB(new Error('Error when retrieving contacts'));
      });
    }
  };

  exports.ContactsService = ContactsService;
}(this));

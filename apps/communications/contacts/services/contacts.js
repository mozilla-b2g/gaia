(function(exports) {

  /* global utils */
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


  // All events based on mozConcacts will be handled by this var
  var events = {};

  // Execute all handlers based on an event type
  function executeHandlers(e) {

    var handlers = events[e.type];
    if (!handlers) {
      return;
    }
    for (var i = 0; i < handlers.length; i++) {
      handlers[i](e);
    }
  }

  function registerListeners(event) {
    navigator.mozContacts.addEventListener(event, executeHandlers);
  }

  function unregisterListeners(event) {
    navigator.mozContacts.removeEventListener(event, executeHandlers);
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
      var req = navigator.mozContacts.getCount();
      req.onsuccess = function() {
        callback(null, req.result === 0);
      };

      req.onerror = function() {
        callback(new Error('Error while retrieving the number of Contacts'));
      };
    },
    save: function(contact, callback) {
      var req = navigator.mozContacts.save(contact);
      req.onsuccess = function() {
        callback();
      };
      req.onerror = function() {
        callback(req.error);
      };
    },
    remove: function(contact, callback) {
      var request =
        navigator.mozContacts.remove(utils.misc.toMozContact(contact));
      request.onsuccess = function() {
        callback();
      };
      request.onerror = function() {
        callback(new Error('mozContact.remove was not'));
      };
    },
    get: function getContactByID(contactID, successCb, errorCb) {
      if (!contactID) {
        successCb();
        return;
      }

      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: contactID
      };
      var request = navigator.mozContacts.find(options);

      request.onsuccess = function findCallback(e) {
        var result = e.target.result[0];

        successCb(result);
      }; // request.onsuccess

      if (typeof errorCb === 'function') {
        request.onerror = errorCb;
      }
    },
    getAll: function(callback) {
      if (typeof callback !== 'function') {
        return;
      }
      var request = navigator.mozContacts.find({});
      request.onsuccess = function onSuccess() {
        callback(null, request.result);
      };
      request.onerror = function onError() {
        callback(new Error('mozContacts.find for retrieving all dont work'));
      };
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

      // Execute the search
      var options = {
        sortBy: sortBy,
        sortOrder: 'ascending'
      };
      var cursor = navigator.mozContacts.getAll(options);

      cursor.onsuccess = function onsuccess(evt) {
        var contact = evt.target.result;
        if (contact) {
          onContactCB(contact);
          cursor.continue();
        } else {
          onCompleteCB();
        }
      };
      cursor.onerror = onErrorCB;
    }
  };

  exports.ContactsService = ContactsService;
}(this));

/* global Components, Services */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

/**
 * Mock object of navigator.mozMobileMessage used in marionette js tests.
 * Developers using this mock should follow these rules:
 * - non-primitive types that are returned from the mock should be wrapped with
 *   Components.utils.cloneInto - to create clone of data to be passed from
 *   privileged (chrome) code to less privileged (content) one, so that content
 *   won't be able to change source data directly;
 * - mock returns results immediately, without any delay.
 */
Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  var eventHandlers = new Map();

  function callEventHandlers(eventName, parameters) {
    var handlers = eventHandlers.get(eventName);

    if (handlers) {
      handlers.forEach(function(handler) {
        handler.call(null, parameters);
      });
    }
  }

  var storagePromise = null;
  function getStorage() {
    if (!storagePromise) {
      var appWindow = window.wrappedJSObject;

      if (!appWindow.TestStorages) {
        storagePromise = Promise.resolve();
      } else {
        storagePromise = appWindow.TestStorages.getStorage('messagesDB');
      }

      storagePromise = storagePromise.then(function(storage) {
        return storage || {
          threads: new Map(),
          recipientToThreadId: new Map(),
          uniqueMessageIdCounter: 0
        };
      });
    }

    return storagePromise;
  }

  function getOrCreateThreadForRecipient(storage, recipient) {
    var threadId = storage.recipientToThreadId.get(recipient);

    if (!threadId) {
      threadId = storage.recipientToThreadId.size + 1;
      storage.threads.set(threadId, { id: threadId, messages: [] });
      storage.recipientToThreadId.set(recipient, threadId);
    }

    return storage.threads.get(threadId);
  }

  function createMessage(parameters) {
    return getStorage().then(function(storage) {
      var thread = getOrCreateThreadForRecipient(
        storage,
        parameters.receiver || parameters.receivers[0]
      );

      var message = {
        id: ++storage.uniqueMessageIdCounter,
        iccId: null,
        threadId: thread.id,
        sender: null,
        receivers: parameters.receivers,
        receiver: parameters.receiver,
        type: parameters.type,
        delivery: 'sending',
        deliveryInfo: [{
          receiver: null,
          deliveryStatus: 'not-applicable',
          readStatus: 'not-applicable'
        }],
        subject: parameters.subject,
        smil: parameters.smil,
        body: parameters.body,
        attachments: parameters.attachments,
        timestamp: Date.now(),
        sentTimestamp: Date.now(),
        read: true
      };

      thread.messages.push(message);

      return message;
    });
  }

  var MobileMessage = {
    getSegmentInfoForText: function(text) {
      var request = Services.DOMRequest.createRequest(window);

      var segmentLength = 160;
      var charsUsedInLastSegment = (text.length % segmentLength);

      // Very simple example of message segmentation logic, in reality it's more
      // complex, e.g. see real "calculateLength" method here:
      // https://android.googlesource.com/platform/frameworks/opt/telephony/+/android-5.0.1_r1/src/java/android/telephony/SmsMessage.java
      var result = {
        segments: Math.ceil(text.length / segmentLength),
        charsAvailableInLastSegment: charsUsedInLastSegment ?
          segmentLength - charsUsedInLastSegment : 0
      };

      // See description at the top of the file about "cloneInto" necessity.
      Services.DOMRequest.fireSuccessAsync(
        request, Cu.cloneInto(result, window)
      );

      return request;
    },

    sendMMS: function(parameters, options) {
      var request = Services.DOMRequest.createRequest(window);

      parameters.type = 'mms';

      createMessage(parameters, options).then(function(message) {
        Services.DOMRequest.fireSuccessAsync(request, null);

        // See description at the top of the file about "cloneInto" necessity.
        callEventHandlers(
          'sending', Cu.cloneInto({ message: message }, window)
        );
      });

      return request;
    },

    send: function(recipients, content, options) {
      // If we don't clone array here, content code will complain that it
      // can't access "length" array property, also we clone only "array" here
      // as we should not clone DOMRequest itself.
      var requests = Cu.cloneInto([], window);

      return recipients.reduce((requests, receiver) => {
        var request = Services.DOMRequest.createRequest(window);

        var parameters = {
          type: 'sms',
          body: content,
          receiver: receiver
        };

        createMessage(parameters, options).then(function(message) {
          // Since it's test we just return result immediately
          Services.DOMRequest.fireSuccessAsync(request, null);

          // See description at the top of the file about "cloneInto" necessity.
          callEventHandlers(
            'sending', Cu.cloneInto({ message: message }, window)
          );
        });

        requests.push(request);

        return requests;
      }, requests);
    },

    getThreads: function() {
      var threads = null;

      var handleCursor = function() {
        var iteratorResult = threads.next();

        if (!iteratorResult.done) {
          // See description at the top of the file about "cloneInto" necessity.
          Services.DOMRequest.fireSuccessAsync(
            cursor, Cu.cloneInto(iteratorResult.value, window)
          );
        } else {
          Services.DOMRequest.fireDone(cursor);
        }
      };

      var cursor = Services.DOMRequest.createCursor(window, handleCursor);

      getStorage().then(function(storage) {
        threads = storage.threads.values();

        handleCursor();
      });

      return cursor;
    },

    getMessages: function(filter) {
      var messages = null;

      var handleCursor = function() {
        var iteratorResult = messages.next();

        if (!iteratorResult.done) {
          // See description at the top of the file about "cloneInto" necessity.
          Services.DOMRequest.fireSuccessAsync(
            cursor, Cu.cloneInto(iteratorResult.value, window)
          );
        } else {
          Services.DOMRequest.fireDone(cursor);
        }
      };

      var cursor = Services.DOMRequest.createCursor(window, handleCursor);

      // Currently we need only "threadId" filter parameter.
      if (filter && filter.threadId) {
        getStorage().then(function(storage) {
          var thread = storage.threads.get(filter.threadId);

          // Remove this once Array.prototype.values() is landed (bug 875433).
          messages = new Set(thread && thread.messages || []).values();

          handleCursor();
        });
      } else {
        Services.DOMRequest.fireErrorAsync(cursor, 'Filter is not defined');
      }

      return cursor;
    },

    getMessage: function(id) {
      var request = Services.DOMRequest.createRequest(window);

      getStorage().then(function(storage) {
        var isRequestedMessage = (message) => message.id === id;

        var requestedMessage;
        for (var thread of storage.threads.values()) {
          if ((requestedMessage = thread.messages.find(isRequestedMessage))) {
            break;
          }
        }

        if (requestedMessage) {
          // See description at the top of the file about "cloneInto" necessity.
          Services.DOMRequest.fireSuccessAsync(
            request, Cu.cloneInto(requestedMessage, window)
          );
        } else {
          Services.DOMRequest.fireErrorAsync(request, 'No message found!');
        }
      });

      return request;
    },

    markMessageRead: function() {
      var request = Services.DOMRequest.createRequest(window);

      Services.DOMRequest.fireSuccessAsync(request, null);

      return request;
    },

    addEventListener: function(event, handler) {
      var listeners = eventHandlers.get(event) || [];
      listeners.push(handler);
      eventHandlers.set(event, listeners);
    }
  };

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozMobileMessage', {
    configurable: false,
    writable: true,
    value: Cu.cloneInto(MobileMessage, window, {cloneFunctions: true})
  });
}, 'document-element-inserted', false);

/* global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;

  var delayMs = 100,
      eventHandlers = new Map(),
      recipientToThreadId = new Map(),
      threads = new Map(),
      messageIdUniqueCounter = 0;

  function callEventHandlers(eventName, parameters) {
    var handlers = eventHandlers.get(eventName);

    if (handlers) {
      handlers.forEach(function(handler) {
        handler.call(null, exposeObject(parameters));
      });
    }
  }

  function getOrCreateThreadForRecipient(recipient) {
    var threadId = recipientToThreadId.get(recipient);

    if (!threadId) {
      threadId = recipientToThreadId.size + 1;
      threads.set(threadId, {
        id: threadId,
        messages: []
      });
    }

    return threads.get(threadId);
  }

  function exposeObject(object, permission) {
    if (!object || typeof object !== 'object') {
      return object;
    }

    if (Array.isArray(object)) {
      object.forEach(function(item) {
        exposeObject(item, permission);
      });
      return object;
    }

    try {
      object.__exposedProps__ = Object.keys(object).reduce(
        function(props, key) {
          props[key] = permission || 'r';

          exposeObject(object[key]);

          return props;
        }, {}
      );
    } catch(e) {
      window.console.error(e);
    }

    return object;
  }

  function createMessage(parameters) {
    var thread = getOrCreateThreadForRecipient(parameters.receivers[0]);

    var message = {
      id: ++messageIdUniqueCounter,
      iccId: null,
      threadId: thread.id,
      sender: null,
      receivers: parameters.receivers,
      type: 'mms',
      delivery: 'sending',
      deliveryInfo: [{
        receiver: null,
        deliveryStatus: 'not-applicable',
        readStatus: 'not-applicable'
      }],
      subject: parameters.subject,
      smil: parameters.smil,
      attachments: parameters.attachments,
      timestamp: Date.now(),
      sentTimestamp: Date.now(),
      read: true
    };

    thread.messages.push(message);

    return message;
  }

  var MobileMessage = {
    getSegmentInfoForText: function(text) {
      var request = exposeObject({
        onsuccess: null,
        onerror: null
      }, 'wr');

      window.setTimeout(function() {
        var length = text.length;
        var segmentLength = 160;
        var charsUsedInLastSegment = (length % segmentLength);
        var segments = Math.ceil(length / segmentLength);
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request, exposeObject({
            target: {
              result: {
                segments: segments,
                charsAvailableInLastSegment: charsUsedInLastSegment ?
                  segmentLength - charsUsedInLastSegment : 0
              }
            }
          }));
        }
      }, delayMs);

      return request;
    },

    sendMMS: function(parameters, options) {
      var request = exposeObject({
        onsuccess: null,
        onerror: null
      }, 'wr');

      window.setTimeout(function() {
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request, exposeObject({
            target: { result: null }
          }));
        }
        callEventHandlers('sending', exposeObject({
          message: createMessage(parameters, options)
        }));
      }, delayMs);

      return request;
    },

    getThreads: function() {
      var cursor = exposeObject({
        onsuccess: null,
        onerror: null
      }, 'wr');

      window.setTimeout(function() {
        if (typeof cursor.onsuccess === 'function') {
          cursor.onsuccess.call(cursor);
        }
      }, delayMs);

      return cursor;
    },

    getMessages: function(filter) {
      var cursor = exposeObject({
        onsuccess: null,
        onerror: null,
        result: null,
        continue: null,
        done: false
      }, 'wr');

      window.setTimeout(function() {
        if (typeof cursor.onsuccess === 'function') {
          var thread = threads.get(filter.threadId),
              currentIndex = -1;

          cursor.continue = function() {
            if (!thread || ++currentIndex >= thread.messages.length) {
              cursor.done = true;
              cursor.continue = null;
              cursor.result = null;
            } else {
              cursor.result = thread.messages[currentIndex];
            }
            cursor.onsuccess.call(cursor);
          };

          cursor.continue();
        }
      }, delayMs);

      return cursor;
    },

    getMessage: function(id) {
      var request = exposeObject({
        onsuccess: null,
        onerror: null,
        result: null
      }, 'wr');

      window.setTimeout(function() {
        if (typeof request.onsuccess === 'function') {
          threads.forEach(function(thread) {
            thread.messages.forEach(function(message) {
              if (message.id === id) {
                request.result = message;
              }
            });
          });
          request.onsuccess.call(request);
        }
      }, delayMs);

      return request;
    },

    markMessageRead: function() {
      var request = exposeObject({
        onsuccess: null,
        onerror: null
      }, 'wr');

      window.setTimeout(function() {
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request);
        }
      }, delayMs);

      return request;
    },

    addEventListener: function(event, handler) {
      var listeners = eventHandlers.get(event) || [];
      listeners.push(handler);
      eventHandlers.set(event, listeners);
    }
  };

  window.navigator.__defineGetter__('mozMobileMessage', function() {
    return exposeObject(MobileMessage);
  });
}, 'document-element-inserted', false);

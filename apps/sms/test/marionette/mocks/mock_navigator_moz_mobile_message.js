/* global Components, Services */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  var delayMs = 100,
      eventHandlers = new Map(),
      recipientToThreadId = new Map(),
      threads = new Map(),
      messageIdUniqueCounter = 0;

  function callEventHandlers(eventName, parameters) {
    var handlers = eventHandlers.get(eventName);

    if (handlers) {
      handlers.forEach(function(handler) {
        handler.call(null, parameters);
      });
    }
  }

  function getOrCreateThreadForRecipient(recipient) {
    var threadId = recipientToThreadId.get(recipient);

    if (!threadId) {
      threadId = recipientToThreadId.size + 1;
      threads.set(threadId, Cu.waiveXrays(Cu.cloneInto({
        id: threadId,
        messages: []
      }, window)));
    }

    return threads.get(threadId);
  }

  function createMessage(parameters) {
    var thread = getOrCreateThreadForRecipient(
        parameters.receiver || parameters.receivers[0]
    );

    var message = Cu.waiveXrays(Cu.cloneInto({
      id: ++messageIdUniqueCounter,
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
    }, window));

    thread.messages.push(message);

    return message;
  }

  var MobileMessage = {
    getSegmentInfoForText: function(text) {
      var request = Cu.waiveXrays(Cu.cloneInto({
        onsuccess: null,
        onerror: null
      }, window));

      window.setTimeout(function() {
        var length = text.length;
        var segmentLength = 160;
        var charsUsedInLastSegment = (length % segmentLength);
        var segments = Math.ceil(length / segmentLength);
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request, Cu.cloneInto({
            target: {
              result: {
                segments: segments,
                charsAvailableInLastSegment: charsUsedInLastSegment ?
                  segmentLength - charsUsedInLastSegment : 0
              }
            }
          }, window));
        }
      }, delayMs);

      return request;
    },

    sendMMS: function(parameters, options) {
      var request = Cu.waiveXrays(Cu.cloneInto({
        onsuccess: null,
        onerror: null
      }, window));

      window.setTimeout(function() {
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request, Cu.cloneInto({
            target: { result: null }
          }, window));
        }

        parameters.type = 'mms';

        callEventHandlers('sending', Cu.waiveXrays(Cu.cloneInto({
          message: createMessage(parameters, options)
        }, window)));
      }, delayMs);

      return request;
    },

    send: function(recipients, content, options) {
      var requests = Cu.waiveXrays(Cu.cloneInto(recipients.map(() => ({
        onsuccess: null,
        onerror: null
      })), window));

      requests.forEach((request, index) => {
        window.setTimeout(function() {
          if (typeof request.onsuccess === 'function') {
            request.onsuccess.call(request, Cu.cloneInto({
              target: { result: null }
            }, window));
          }
          var parameters = {
            type: 'sms',
            body: content,
            receiver: recipients[index]
          };

          var o = new window.Object();
          o.message = createMessage(parameters, options);

          callEventHandlers('sending', o);
        }, delayMs);
      });

      return requests;
    },

    getThreads: function() {
      var cursor = Cu.waiveXrays(Cu.cloneInto({
        onsuccess: null,
        onerror: null
      }, window));

      window.setTimeout(function() {
        if (typeof cursor.onsuccess === 'function') {
          cursor.onsuccess.call(cursor);
        }
      }, delayMs);

      return cursor;
    },

    getMessages: function(filter) {
      var cursor = Cu.waiveXrays(Cu.cloneInto({
        onsuccess: null,
        onerror: null,
        result: null,
        continue: null,
        done: false
      }, window));

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
      var request = Cu.waiveXrays(Cu.cloneInto({
        onsuccess: null,
        onerror: null,
        result: null
      }, window));

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
      var request = Cu.waiveXrays(Cu.cloneInto({
        onsuccess: null,
        onerror: null
      }, window));

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

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozMobileMessage', {
    configurable: false,
    writable: true,
    value: Cu.cloneInto(MobileMessage, window, {cloneFunctions: true})
  });
}, 'document-element-inserted', false);

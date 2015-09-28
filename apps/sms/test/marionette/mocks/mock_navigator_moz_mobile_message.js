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
        window.setTimeout(() => handler.call(null, parameters), 0);
      });
    }
  }

  function generateCanvas(width, height) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    var linearGradient = context.createLinearGradient(0, 0, width, height);
    linearGradient.addColorStop(0, 'blue');
    linearGradient.addColorStop(1, 'red');

    context.fillStyle = linearGradient;
    context.fillRect (0, 0, width, height);

    return canvas;
  }

  function generateImageBlob(width, height, type, quality) {
    var canvas = generateCanvas(width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        canvas.width = canvas.height = 0;
        canvas = null;

        resolve(blob);
      }, type, quality);
    });
  }

  function rehydrateAttachments(storage) {
    var attachmentPromises = [];

    storage.threads.forEach((thread) => {
      thread.messages && thread.messages.forEach((message) => {
        message.attachments && message.attachments.forEach((attachment, i) => {
          var blobPromise;

          if (attachment.type.startsWith('image/')) {
            blobPromise = generateImageBlob(
              attachment.width, attachment.height, attachment.type
            );
          } else {
            blobPromise = Promise.resolve(
              new window.Blob([attachment.content], { type: attachment.type })
            );
          }

          attachmentPromises.push(
            blobPromise.then((blob) => {
              message.attachments[i] = Cu.cloneInto({ content: blob }, window);
            })
          );
        });
      });
    });

    return Promise.all(attachmentPromises);
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

      storagePromise = storagePromise.then((storage) => {
        if (!storage) {
          return {
            threads: new Map(),
            recipientToThreadId: new Map(),
            uniqueMessageIdCounter: 0
          };
        }

        return rehydrateAttachments(storage).then(() => storage);
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

  function getMessageParticipants(message) {
    var numbers = [];

    if (message.sender) {
      numbers.push(message.sender);
    }

    if (message.receiver) {
      numbers.push(message.receiver);
    }

    if (message.receivers) {
      numbers.push(...message.receivers);
    }

    return numbers;
  }

  function getMessagesWithFilter(threads, filter) {
    var messages = [];

    if (filter.threadId) {
      var threadByFilter = threads.get(filter.threadId);
      if (threadByFilter) {
        messages = threadByFilter.messages;
      }
    } else if (filter.numbers && filter.numbers.length) {
      for (var thread of threads.values()) {
        for (var message of thread.messages) {
          // It's very simplified number matching logic, in real code matching
          // strategy is more complex and based on PhoneNumberUtils.
          var isRequestedMessage = getMessageParticipants(message).some(
            (number) => filter.numbers.indexOf(number) >= 0
          );

          if (isRequestedMessage) {
            messages.push(message);
          }
        }
      }
    }

    return new Set(messages).values();
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

       if (filter) {
        getStorage().then(function(storage) {
          messages = getMessagesWithFilter(storage.threads, filter);
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

    delete: function(id) {
      var request = Services.DOMRequest.createRequest(window);
      var messageToDeleteIds = Array.isArray(id) ? id : [id];

      getStorage().then((storage) => {
        var messagesToDelete = [];
        for (var thread of storage.threads.values()) {
          messageToDeleteIds.forEach((id) => {
            var messageToDeleteIndex = thread.messages.findIndex((message) => {
              return message.id === id;
            });

            if (messageToDeleteIndex >= 0) {
              messagesToDelete.push({
                thread: thread,
                messageIndex: messageToDeleteIndex
              });
            }
          });

          // All messages found.
          if (messagesToDelete.length === messageToDeleteIds.length) {
            break;
          }
        }

        if (messagesToDelete.length) {
          var deletedThreadIds = [];
          messagesToDelete.forEach((messageToDeleteInfo) => {
            messageToDeleteInfo.thread.messages.splice(
              messageToDeleteInfo.messageIndex, 1
            );

            if (!messageToDeleteInfo.thread.messages.length) {
              storage.threads.delete(messageToDeleteInfo.thread.id);
              deletedThreadIds.push(messageToDeleteInfo.thread.id);
            }
          });

          // See description at the top of the file about "cloneInto" necessity.
          Services.DOMRequest.fireSuccess(request, null);

          if (deletedThreadIds.length) {
            callEventHandlers(
              'deleted',
              Cu.cloneInto({ deletedThreadIds: deletedThreadIds }, window)
            );
          }
        } else {
          Services.DOMRequest.fireError(request, 'No message found!');
        }
      });

      return request;
    },

    markMessageRead: function() {
      var request = Services.DOMRequest.createRequest(window);

      Services.DOMRequest.fireSuccessAsync(request, null);

      return request;
    },

    retrieveMMS: function(messageId) {
      var request = Services.DOMRequest.createRequest(window);

      getStorage().then((storage) => {
        var isNotDownloadedMMS = (message) => message.id === messageId &&
          message.type === 'mms' && message.delivery === 'not-downloaded';

        var notDownloadedMMS;
        for (var thread of storage.threads.values()) {
          if ((notDownloadedMMS = thread.messages.find(isNotDownloadedMMS))) {
            break;
          }
        }

        if (notDownloadedMMS) {
          Services.DOMRequest.fireSuccess(request, null);

          notDownloadedMMS.delivery = 'received';
          callEventHandlers(
            'received', Cu.cloneInto({ message: notDownloadedMMS }, window)
          );
        } else {
          Services.DOMRequest.fireError(
            request, 'No message to download found!'
          );
        }
      });

      return request;
    },

    addEventListener: function(event, handler) {
      var listeners = eventHandlers.get(event) || [];
      listeners.push(handler);
      eventHandlers.set(event, listeners);
    }
  };

  var appWindow = window.wrappedJSObject;
  Object.defineProperty(appWindow.navigator, 'mozMobileMessage', {
    configurable: false,
    // If we're in iframe we should use parent's mozMobileMessage instead.
    value: appWindow.parent !== appWindow ?
      appWindow.parent.navigator.mozMobileMessage :
      Cu.cloneInto(MobileMessage, window, { cloneFunctions: true })
  });
}, 'document-element-inserted', false);

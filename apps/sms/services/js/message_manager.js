/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


/* global EventDispatcher,
    Promise,
    Settings,
    SMIL,
    Threads,
    Utils
*/

/*exported MessageManager */

/**
 * MessageManager wraps around {@link http://mdn.io/MozMobileMessageManager}
 * that makes access to SMS/MMS related operations (sending, handling
 * read/delivery reports etc.) and respective events easier.
 * @module MessageManager
 */
'use strict';
(function(exports) {
var MessageManager = {

  /**
   * Initializes MessageManager and subscribes for required
   * {@link http://mdn.io/MozMobileMessageManager} events.
   * Should be always called before calling any other MessageManager methods.
   */
  init: function mm_init() {
    this._mozMobileMessage = navigator.mozMobileMessage;

    this._mozMobileMessage.addEventListener(
      'received', this.onMessageReceived.bind(this)
    );
    this._mozMobileMessage.addEventListener(
      'sending', this.onMessageSending.bind(this)
    );
    this._mozMobileMessage.addEventListener(
      'sent', this.onMessageSent.bind(this)
    );
    this._mozMobileMessage.addEventListener(
      'failed', this.onMessageFailed.bind(this)
    );
    this._mozMobileMessage.addEventListener(
      'readsuccess', this.onReadSuccess.bind(this)
    );
    this._mozMobileMessage.addEventListener(
      'deliverysuccess', this.onDeliverySuccess.bind(this)
    );
    this._mozMobileMessage.addEventListener(
      'deleted', this.onDeleted.bind(this)
    );
  },

  /**
   * Event occurs when an SMS or MMS enters the send flow.
   * @param {MozSmsEvent|MozMmsEvent} e Instance of
   * {@link http://mdn.io/MozSmsEvent} or {@link http://mdn.io/MozMmsEvent}.
   */
  onMessageSending: function mm_onMessageSending(e) {
    Threads.registerMessage(e.message);

    this.emit('message-sending', { message: e.message });
  },

  /**
   * Specifies an event listener to receive "failed" events. These events occur
   * when sending an MMS or SMS has failed.
   * @param {MozSmsEvent|MozMmsEvent} e Instance of
   * {@link http://mdn.io/MozSmsEvent} or {@link http://mdn.io/MozMmsEvent}.
   */
  onMessageFailed: function mm_onMessageFailed(e) {
    this.emit('message-failed-to-send', { message: e.message });
  },

  /**
   * Specifies an event listener to receive "deliverysuccess" events. These
   * events occur when an SMS or MMS is delivered.
   * @param {MozSmsEvent|MozMmsEvent} e Instance of
   * {@link http://mdn.io/MozSmsEvent} or {@link http://mdn.io/MozMmsEvent}.
   */
  onDeliverySuccess: function mm_onDeliverySuccess(e) {
    this.emit('message-delivered', { message: e.message });
  },

  /**
   * Specifies an event listener to receive "read" events. These events
   * occur when MMS is read by recipient (read status isn't supported by SMS).
   * @param {MozMmsEvent} e Instance of {@link http://mdn.io/MozMmsEvent}.
   */
  onReadSuccess: function mm_onReadSuccess(e) {
    this.emit('message-read', { message: e.message });
  },

  /**
   * Specifies an event listener to receive "sent" events. These events occur
   * when an SMS or MMS is sent.
   * @param {MozSmsEvent|MozMmsEvent} e Instance of
   * {@link http://mdn.io/MozSmsEvent} or {@link http://mdn.io/MozMmsEvent}.
   */
  onMessageSent: function mm_onMessageSent(e) {
    this.emit('message-sent', { message: e.message });
  },

  /**
   * Specifies an event listener to receive "received" events. These events
   * occur when an SMS or MMS is received. Event handler executed when new SMS
   * or MMS is received.
   * @param {MozSmsEvent|MozMmsEvent} e Instance of
   * {@link http://mdn.io/MozSmsEvent} or {@link http://mdn.io/MozMmsEvent}.
   */
  onMessageReceived: function mm_onMessageReceived(e) {
    var message = e.message;

    if (message.messageClass && message.messageClass === 'class-0') {
      return;
    }

    // Here we can only have one sender, so deliveryInfo[0].deliveryStatus =>
    // message status from sender. Ignore 'pending' messages that are received
    // this means we are in automatic download mode.
    if (message.delivery === 'not-downloaded' &&
        message.deliveryInfo[0].deliveryStatus === 'pending') {
      return;
    }

    Threads.registerMessage(message);

    this.emit('message-received', { message: message });
  },

  /**
   * Event handler executed when message is deleted.
   * @param {MozSmsEvent|MozMmsEvent} e Instance of
   * {@link http://mdn.io/MozSmsEvent} or {@link http://mdn.io/MozMmsEvent}.
   */
  onDeleted: function(e) {
    // The method verifies that some threads have been deleted.
    if (e.deletedThreadIds && e.deletedThreadIds.length) {
      this.emit('threads-deleted', {
        ids: e.deletedThreadIds
      });
    }
  },

  /**
   * Obtains all the treads and takes a set of callback functions as an
   * argument.
   * @param {Object} options A set of callback functions as described below:-
   * @param {function) options.each: callback function invoked for each message.
   * @param {function} options.end: callback function run when cursor is "done".
   * @param {function} options.done: callback function run when we iterated
   * through all the threads or consumer requested to do so.
   */
  getThreads: function mm_getThreads(options) {

    var each = options.each;
    var end = options.end;
    var done = options.done;
    var cursor = null;

    // WORKAROUND for bug 958738. We can remove 'try\catch' block once this bug
    // is resolved.
    try {
      cursor = this._mozMobileMessage.getThreads();
    } catch(e) {
      console.error('Error occurred while retrieving threads:', e.name, e);
      end && end();
      done && done();

      return;
    }

    cursor.onsuccess = function onsuccess() {
      if (this.result) {
        // Invoking callback on each thread.
        each && each(this.result);

        this.continue();
        return;
      }

      // Invoking terminating callbacks.
      end && end();
      done && done();
    };

    cursor.onerror = function onerror() {
      console.error('Reading the database. Error: ' + this.error.name);
      done && done();
    };
  },

  /**
   * Method used to access message having a given id.
   * @param {number} id The id of the message we wish to get.
   * @return {DOMRequest<SmsMessage|MmsMessage>}
   */
  getMessage: function mm_getMsg(id) {
    return this._mozMobileMessage.getMessage(id);
  },

  /**
   * Method to get the MMS object having a given id.
   * @param {number} id The id of the MMS we wish to get.
   * @return {DOMRequest<MmsMessage>}
   */
  retrieveMMS: function mm_retrieveMMS(id) {
    return this._mozMobileMessage.retrieveMMS(id);
  },

  /**
   * Obtains all the messages using a given filter.
   * @param {Object} options A set of callback functions as described below:-
   * @param {function} options.each callback function invoked for each message.
   * @param {function} options.end callback function run when cursor is "done".
   * @param {function} options.endArgs specify arguments for the "end" callback.
   * @param {function} options.done callback function invoked when we iterated
   * through all the messages or consumer requested to do so.
   * @param {function} options.filter a MobileMessageFilter or similar object.
   * @param {boolean} invert option to invert the selection.
   */
  getMessages: function mm_getMgs(options) {
    var each = options.each;
    var invert = options.invert;
    var end = options.end;
    var endArgs = options.endArgs;
    var done = options.done;
    var filter = options.filter;
    var cursor = this._mozMobileMessage.getMessages(filter, !invert);

    cursor.onsuccess = function onsuccess() {
      if (!this.done) {
        var shouldContinue = true;
        if (each) {
          shouldContinue = each(this.result);
        }
        // if each returns false the iteration stops.
        if (shouldContinue !== false) { // if this is undefined this is fine.
          this.continue();
        } else {
          done && done();
        }
      } else {
        end && end(endArgs);
        done && done();
      }
    };
    cursor.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + this.error.name;
      console.log(msg);
      done && done();
    };
  },

  /**
   * Sanitizes the "serviceId". It works as follows:-
   * 0 is a valid value so we need to take care to not consider it as a falsy
   * value. We want to return null for anything that's not a number or a string
   * containing a number.
   * @param {number|string} id The service ID.
   * @private
   * @return {?number}
   */
  _sanitizeServiceId: function mm_sanitizeServiceId(serviceId) {
    if (serviceId == null || // null or undefined
        isNaN(+serviceId)) {
      serviceId = null;
    } else {
      serviceId = +serviceId;
    }

    return serviceId;
  },

  /**
   * Gets send options for the specified "serviceId".
   * @param {number|string} id The service ID.
   * @private
   * @return {{ serviceId: number|string }}
   */
  _getSendOptionsFromServiceId: function mm_gSOFSI(serviceId) {
    var sendOpts;

    if (serviceId != null && // not null, not undefined
        Settings.hasSeveralSim()) {
      sendOpts = { serviceId: serviceId };
    }

    return sendOpts;
  },

  /**
   * Sends an SMS based on the specified parameters object
   * @param {Object} opts Options object that contains :-
   * - recipients (string or array of string): contains the list of recipients
   *   for this message.
   * - content (string): the message's body.
   * - serviceId (optional long or string): the SIM serviceId we use to send the
   *   message.
   * - onsuccess (optional function): will be called when one SMS has been
   *   sent successfully, with the request's result as argument. Can be called
   *   several times.
   * - onerror (optional function): will be called when one SMS transmission
   *   failed, with the error object as argument. Can be called several times.
   * - oncomplete (optional function): will be called when all messages have
   *   been sent. It's argument will have the following properties:
   *   + hasError (boolean): whether we had at least one error
   *   + return (array): each item is an object with the following properties:
   *     . success (boolean): whether this is a success or an error.
   *     . result (request's result): the request's result object.
   *     . recipient (string): the recipient used for this transmission.
   */
  sendSMS: function mm_send(opts) {
    var recipients = opts.recipients || [],
        content = opts.content,
        serviceId = this._sanitizeServiceId(opts.serviceId),
        onsuccess = opts.onsuccess,
        onerror = opts.onerror,
        oncomplete = opts.oncomplete;

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    // The returned value is not a DOM request!
    // Instead, It's an array of DOM requests.
    var i = 0;
    var requestResult = { hasError: false, return: [] };

    // Getting serviceId field in sendOpts.
    var sendOpts = this._getSendOptionsFromServiceId(serviceId);

    var requests = this._mozMobileMessage.send(recipients, content, sendOpts);

    var numberOfRequests = requests.length;

    requests.forEach(function(request, idx) {
      request.onsuccess = function onSuccess(event) {
        // Callback functions executed message has been successfully sent.
        onsuccess && onsuccess(event.target.result);

        requestResult.return.push({
          success: true,
          result: event.target.result,
          recipient: recipients[idx]
        });

        // Last callback, oncomplete, executed at the end of the loop.
        if (i === numberOfRequests - 1) {
          oncomplete && oncomplete(requestResult);
        }
        i++;
      };

      request.onerror = function onError(event) {
        console.error('Error Sending: ' + JSON.stringify(event.target.error));
        onerror && onerror(event.target.error);

        requestResult.hasError = true;
        requestResult.return.push({
          success: false,
          code: event.target.error,
          recipient: recipients[idx]
        });

        if (i === numberOfRequests - 1) {
          oncomplete && oncomplete(requestResult);
        }
        i++;
      };
    });
  },

  /**
   * Sends an MMS based on the specified parameters object
   * @param {Object} opts is the options field with the following properties:
   * - recipients (string or array of string): recipients for this message
   * - subject (optional string): subject for this message
   * - content (array of SMIL slides): this is the content for the message (see
   *   ConversationView for more information)
   * - serviceId (optional long or string): the SIM that should be used for
   *   sending this message. If this is not the current default configuration
   *   for sending MMS, then we'll first switch the configuration to this
   *   serviceId, and only then send the message. That means that the "sending"
   *   event will come quite late in this case.
   * - onsuccess (optional func): called only once, even for several recipients,
   *   when the message is successfully sent.
   * - onerror (optional func): called only once if there is an error.
   */
  sendMMS: function mm_sendMMS(opts) {
    var request;
    var recipients = opts.recipients,
        subject = opts.subject,
        content = opts.content,
        serviceId = opts.serviceId = this._sanitizeServiceId(opts.serviceId),
        onsuccess = opts.onsuccess,
        onerror = opts.onerror;

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    var message = SMIL.generate(content);

    var sendOpts = this._getSendOptionsFromServiceId(serviceId);

    request = this._mozMobileMessage.sendMMS({
      receivers: recipients,
      subject: subject,
      smil: message.smil,
      attachments: message.attachments
    }, sendOpts);

    request.onsuccess = function onSuccess(event) {
      onsuccess && onsuccess(event.target.result);
    };

    request.onerror = function onError(event) {
      onerror && onerror(event.target.error);
    };
  },

  /**
   * Resends message with the given options.
   * @param {Object} opts Options is the object with the following properties:-
   * - message (object): the message object containing all the information
   *   depending on the type of the message which can be 'sms' or 'mms'.
   * - onsuccess (optional function): will be called when the message has been
   *   sent successfully, with the request's result as argument. Can be called
   *   several times.
   * - onerror (optional function): will be called when the message transmission
   *   failed, with the error object as argument. Can be called several times.
   */
  resendMessage: function mm_resendMessage(opts) {
    var message = opts.message;

    if (!message) {
      throw new Error('Message to resend is not defined.');
    }

    var serviceId = Settings.getServiceIdByIccId(message.iccId);
    var sendOpts = this._getSendOptionsFromServiceId(serviceId);
    var onsuccess = opts.onsuccess;
    var onerror = opts.onerror;
    var request;

    if (message.type === 'sms') {
      request = this._mozMobileMessage.send(
        message.receiver, message.body, sendOpts);
    }
    if (message.type === 'mms') {
      request = this._mozMobileMessage.sendMMS({
        receivers: message.receivers,
        subject: message.subject,
        smil: message.smil,
        attachments: message.attachments
      }, sendOpts);
    }

    request.onsuccess = function onSuccess(evt) {
      MessageManager.deleteMessages(message.id);
      onsuccess && onsuccess(evt.target.result);
    };

    request.onerror = function onError(evt) {
      MessageManager.deleteMessages(message.id);
      onerror && onerror(evt.target.error);
    };
  },

  /**
   * Deletes messages using the message id provided.
   * @param {number} id The ID of the message to be deleted.
   * @return {Promise}
   */
  deleteMessages: function mm_deleteMessages(id) {
    // As DOMRequest doesn't have "catch" method we should use "then" with
    // "null" for the success callback to handle reject case only.
    return this._mozMobileMessage.delete(id).then(null, (e) => {
      // TODO: If the messages could not be deleted completely, conversation
      // view will also update without notification currently. May need more
      // information for user that the messages were not removed completely.
      // See bug #1045666 for details.
      console.error(`Deleting in the database. [${e.name}] ${e.message || ''}`);

      return null;
    });
  },

  /**
   * Marks a thread as read or unread depending on value of isRead as true or
   * false respectively.
   * @param {number|string} threadId The ID of the thread to be marked as read.
   * @param {boolean} isRead If "true" then message is to be marked as read
   * otherwise message is to be marked as unread.
   */
  markThreadRead: function mm_markThreadRead(threadId, isRead = true) {
    // Create filter object to mark all unread messages of the specified thread.
    var filter = {};
    filter.threadId = +threadId;
    filter.read = !isRead;

    var messagesUnreadIDs = [];

    // Building the options field in getMessages() with above filter.
    var changeStatusOptions = {
      each: function addUnreadMessage(message) {
        // First build up array of Unread message ID.
        messagesUnreadIDs.push(message.id);
        return true;
      },
      filter: filter,
      invert: true,
      end: function handleUnread() {
        // end with marking each of them as read.
        MessageManager.markMessagesRead(messagesUnreadIDs, isRead);
      }
    };
    MessageManager.getMessages(changeStatusOptions);
  },

  /**
   * Marks messages with specified ids as read.
   * @param {Array<Number>} list List of all the message IDs to be changed to
   * read.
   * @param {boolean} isRead Pass true if message is to be marked as read and
   * false if message is to be marked as unread.
   */
  markMessagesRead: function mm_markMessagesRead(list, isRead = true) {
    if (!this._mozMobileMessage || !list.length) {
      return;
    }

    // We chain the calls to the API in a way that we make no call to
    // 'markMessageRead' until a previous call is completed. This way any
    // other potential call to the API, like the one for getting a message
    // list, could be done within the calls to mark the messages as read.

    var id = list.pop();
    // TODO: Third parameter of markMessageRead is return read request.
    //       Here we always return read request for now, but we can let user
    //       decide to return request or not in Bug 971658.
    var req = this._mozMobileMessage.markMessageRead(id, isRead, true);
    // isRead == false i.e mark as unread case, marking only one message
    // as unread is sufficient.
    req.onsuccess = (function onsuccess() {
      if (!list.length || !isRead) {
        return;
      } else if (isRead) {
        this.markMessagesRead(list, isRead);
      }
    }).bind(this);

    req.onerror = function onerror() {
      console.error(
        'Error while marking message %d as read: %s', id, this.error.name
      );
    };
  },

  /**
   * Method used to get the information necessary to create a multipart SMS for
   * a given text.
   * @param {string} text The text used to create the SMS.
   * @return {Promise<MozSmsSegmentInfo>} Instance of
   * {@link http://mdn.io/MozSmsSegmentInfo}
   */
  getSegmentInfo: function mm_getSegmentInfo(text) {
    if (!(this._mozMobileMessage &&
          this._mozMobileMessage.getSegmentInfoForText)) {
      return Promise.reject(new Error('mozMobileMessage is unavailable.'));
    }

    var defer = Utils.Promise.defer();

    var request = this._mozMobileMessage.getSegmentInfoForText(text);
    request.onsuccess = function onsuccess(e) {
      defer.resolve(e.target.result);
    };

    request.onerror = function onerror(e) {
      defer.reject(e.target.error);
    };

    return defer.promise;
  },

  /**
   * This method checks whether message is received from a sender with specified
   * number or sent to this particular number. (in case of MMS only 1-to-1,
   * non-group MMS's are counted).
   * It's used to differentiate from broadcast messages ---> group MMS.
   * @param {number} number Phone number.
   * @param {Object} message A composite object having details about message
   * delivery, type, sender and receiver.
   * @private
   * @return {boolean}
   */
  _isMessageBelongTo1to1Conversation:
  function isMessageBelongTo1to1Conversation(number, message) {
    var isIncoming = message.delivery === 'received' ||
                     message.delivery === 'not-downloaded';
    // if it is a received message, it is a candidate
    // we still need to test the sender in case the user filters with his own
    // number, because we would get all the received messages in this case.
    if (isIncoming) {
      return Utils.probablyMatches(message.sender, number);
    } else {
      switch (message.type) {
        case 'sms':
          // in case of sent messages and sms, we test if the receiver match the
          // filter, to filter out other sent messages in the case user is
          // sending message to himself
          return Utils.probablyMatches(message.receiver, number);
        case 'mms':
          return message.receivers.length === 1 &&
                 Utils.probablyMatches(message.receivers[0], number);
        default:
          console.error('Got an unknown message type: ' + message.type);
          return false;
      }
    }
  },

  /**
   * Find a SMS/MMS thread from a number.
   * @param {number} number Phone number to find thread for.
   * @return {Promise<number>} that is resolved to a threadId or rejected if
   * not found
   */
  findThreadFromNumber: function mm_findThread(number) {

    function checkCandidate(message) {
      var isMessageInThread = MessageManager.
        _isMessageBelongTo1to1Conversation(number, message);
      if (isMessageInThread) {
        threadId = message.threadId;
        return false; // found the message, stop iterating
      }
    }

    var threadId = null;
    var deferred = Utils.Promise.defer();

    MessageManager.getMessages({
      filter: { numbers: [number] },
      each: checkCandidate,
      done: function() {
        if (threadId == null) {
          deferred.reject(new Error('No thread found for number: ' + number));
          return;
        } else {
          deferred.resolve(threadId);
          return;
        }
      }
    });

    return deferred.promise;
  },

  /**
   * This method ensures that threads have been registered in the in-memory
   * cache. In the case it has, the promise returned resolves immediately. If
   * not, it loads the last message from the thread and creates a new entry in
   * cache based on it. It can happen when application loaded from non default
   * page and Thread cache hasn't been populated.
   * @param {number|string} threadId The ID of the thread we wish to register.
   * @return {Promise}
   */
  ensureThreadRegistered(threadId) {
    var getOneMessageForThread = (threadId) => {
      var defer = Utils.Promise.defer();
      this.getMessages({
        each: function(message) {
          defer.resolve(message);
          return false;
        },
        done: function() {
          defer.reject(new Error('found no message'));
        },
        filter: { threadId: threadId }
      });
      return defer.promise;
    };

    // Checking whether Thread cache has this thread.
    if (Threads.has(threadId)) {
      return Promise.resolve();
    }

    return getOneMessageForThread(threadId).then(
      (message) => Threads.registerMessage(message)
    );
  }
};

Object.defineProperty(exports, 'MessageManager', {
  get: function () {
    delete exports.MessageManager;

    exports.MessageManager = EventDispatcher.mixin(MessageManager, [
      'message-sending', 'message-failed-to-send', 'message-delivered',
      'message-read', 'message-sent', 'message-received', 'threads-deleted'
    ]);

    return exports.MessageManager;
  },
  configurable: true,
  enumerable: true
});

})(window);

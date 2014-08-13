/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global
    EventDispatcher,
    MozSmsFilter,
    Promise,
    Settings,
    SMIL,
    Threads,
    Utils
*/

/*exported MessageManager */

'use strict';
(function(exports) {
var MessageManager = {
  init: function mm_init(callback) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    // Allow for stubbing in environments that do not implement the
    // `navigator.mozMobileMessage` API
    this._mozMobileMessage = navigator.mozMobileMessage ||
      window.DesktopMockNavigatormozMobileMessage;

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

    // Callback if needed
    if (typeof callback === 'function') {
      callback();
    }
  },

  onMessageSending: function mm_onMessageSending(e) {
    Threads.registerMessage(e.message);

    this.emit('message-sending', { message: e.message });
  },

  onMessageFailed: function mm_onMessageFailed(e) {
    this.emit('message-failed-to-send', { message: e.message });
  },

  onDeliverySuccess: function mm_onDeliverySuccess(e) {
    this.emit('message-delivered', { message: e.message });
  },

  onReadSuccess: function mm_onReadSuccess(e) {
    this.emit('message-read', { message: e.message });
  },

  onMessageSent: function mm_onMessageSent(e) {
    this.emit('message-sent', { message: e.message });
  },

  onMessageReceived: function mm_onMessageReceived(e) {
    var message = e.message;

    if (message.messageClass && message.messageClass === 'class-0') {
      return;
    }

    // Here we can only have one sender, so deliveryInfo[0].deliveryStatus =>
    // message status from sender. Ignore 'pending' messages that are received
    // this means we are in automatic download mode
    if (message.delivery === 'not-downloaded' &&
        message.deliveryInfo[0].deliveryStatus === 'pending') {
      return;
    }

    Threads.registerMessage(message);

    this.emit('message-received', { message: message });
  },

  onDeleted: function(e) {
    if (e.deletedThreadIds && e.deletedThreadIds.length) {
      this.emit('threads-deleted', {
        ids: e.deletedThreadIds
      });
    }
  },

  getThreads: function mm_getThreads(options) {
    /*
    options {
      each: callback function invoked for each message
      end: callback function invoked when cursor is "done"
      done: callback function invoked when we stopped iterating, either because
            it's the end or because it was stopped. It's invoked after the "end"
            callback.
    }
    */

    var each = options.each;
    var end = options.end;
    var done = options.done;
    var cursor = null;

    // WORKAROUND for bug 958738. We can remove 'try\catch' block once this bug
    // is resolved
    try {
      cursor = this._mozMobileMessage.getThreads();
    } catch(e) {
      console.error('Error occurred while retrieving threads: ' + e.name);
      end && end();
      done && done();

      return;
    }

    cursor.onsuccess = function onsuccess() {
      if (this.result) {
        each && each(this.result);

        this.continue();
        return;
      }

      end && end();
      done && done();
    };

    cursor.onerror = function onerror() {
      console.error('Reading the database. Error: ' + this.error.name);
      done && done();
    };
  },

  getMessage: function mm_getMsg(id) {
    return this._mozMobileMessage.getMessage(id);
  },

  retrieveMMS: function mm_retrieveMMS(id) {
    return this._mozMobileMessage.retrieveMMS(id);
  },

  getMessages: function mm_getMgs(options) {
    /*
    options {
      each: callback function invoked for each message
      end: callback function invoked when cursor is "done"
      endArgs: specify arguments for the "end" callback
      done: callback function invoked when we stopped iterating, either because
            it's the end or because it was stopped. It's invoked after the "end"
            callback.
      filter: a MozMessageFilter or similar object
      invert: option to invert the selection
    }

     */
    var each = options.each;
    var filter = options.filter;
    var invert = options.invert;
    var end = options.end;
    var endArgs = options.endArgs;
    var done = options.done;
    var cursor = this._mozMobileMessage.getMessages(filter, !invert);

    cursor.onsuccess = function onsuccess() {
      if (!this.done) {
        var shouldContinue = true;
        if (each) {
          shouldContinue = each(this.result);
        }
        // if each returns false the iteration stops
        if (shouldContinue !== false) { // if this is undefined this is fine
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

  // 0 is a valid value so we need to take care to not consider it as a falsy
  // value. We want to return null for anything that's not a number or a string
  // containing a number.
  _sanitizeServiceId: function mm_sanitizeServiceId(serviceId) {
    if (serviceId == null || // null or undefined
        isNaN(+serviceId)) {
      serviceId = null;
    } else {
      serviceId = +serviceId;
    }

    return serviceId;
  },

  _getSendOptionsFromServiceId: function mm_gSOFSI(serviceId) {
    var sendOpts;

    if (serviceId != null && // not null, not undefined
        Settings.hasSeveralSim()) {
      sendOpts = { serviceId: serviceId };
    }

    return sendOpts;
  },

  // consider splitting this method for the different use cases
  /*
   * `opts` can have the following properties:
   * - recipients (string or array of string): contains the list of
   *   recipients for this message
   * - content (string): the message's body
   * - serviceId (optional long or string): the SIM serviceId we use to send the
   *   message
   * - onsuccess (optional function): will be called when one SMS has been
   *   sent successfully, with the request's result as argument. Can be called
   *   several times.
   * - onerror (optional function): will be called when one SMS transmission
   *   failed, with the error object as argument. Can be called several times.
   * - oncomplete (optional function): will be called when all messages have
   *   been sent. It's argument will have the following properties:
   *   + hasError (boolean): whether we had at least one error
   *   + return (array): each item is an object with the following properties:
   *     . success (boolean): whether this is a success or an error
   *     . result (request's result): the request's result object
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
    var sendOpts = this._getSendOptionsFromServiceId(serviceId);

    var requests = this._mozMobileMessage.send(recipients, content, sendOpts);

    var numberOfRequests = requests.length;

    requests.forEach(function(request, idx) {
      request.onsuccess = function onSuccess(event) {
        onsuccess && onsuccess(event.target.result);

        requestResult.return.push({
          success: true,
          result: event.target.result,
          recipient: recipients[idx]
        });

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

  /*
   * opts is an object with the following properties:
   * - recipients (string or array of string): recipients for this message
   * - subject (optional string): subject for this message
   * - content (array of SMIL slides): this is the content for the message (see
   *   ThreadUI for more information)
   * - serviceId (optional long or string): the SIM that should be used for
   *   sending this message. If this is not the current default configuration
   *   for sending MMS, then we'll first switch the configuration to this
   *   serviceId, and only then send the message. That means that the "sending"
   *   event will come quite late in this case.
   * - onsuccess (optional func): called only once, even for several recipients,
   *   when the message is successfully sent.
   * - onerror (optional func): called only once if there is an error.
   *
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

  // takes a formatted message in case you happen to have one
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

  deleteMessages: function mm_deleteMessages(id, callback) {
    var req = this._mozMobileMessage.delete(id);
    req.onsuccess = function onsuccess() {
      callback && callback(this.result);
    };

    // TODO: If the messages could not be deleted completely, conversation list
    // page will also update without notification currently. May need more
    // information for user that the messages were not removed completely.
    // See bug #1045666 for details.
    req.onerror = function onerror() {
      var msg = 'Deleting in the database. Error: ' + req.error.name;
      console.log(msg);
      callback && callback(null);
    };
  },

  markThreadRead: function mm_markThreadRead(threadId) {
    var filter = new MozSmsFilter();
    filter.threadId = threadId;
    filter.read = false;

    var messagesUnreadIDs = [];
    var changeStatusOptions = {
      each: function addUnreadMessage(message) {
        messagesUnreadIDs.push(message.id);
        return true;
      },
      filter: filter,
      invert: true,
      end: function handleUnread() {
        MessageManager.markMessagesRead(messagesUnreadIDs);
      }
    };
    MessageManager.getMessages(changeStatusOptions);
  },

  markMessagesRead: function mm_markMessagesRead(list) {
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
    var req = this._mozMobileMessage.markMessageRead(id, true, true);

    req.onsuccess = (function onsuccess() {
      if (!list.length) {
        return;
      }

      this.markMessagesRead(list);
    }).bind(this);

    req.onerror = function onerror() {
      console.error(
        'Error while marking message %d as read: %s', id, this.error.name
      );
    };
  },

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

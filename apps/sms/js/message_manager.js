/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {

  activity: {
    body: null,
    number: null,
    contact: null,
    recipients: null,
    threadId: null,
    isLocked: false
  },

  init: function mm_init(callback) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    // Allow for stubbing in environments that do not implement the
    // `navigator.mozMobileMessage` API
    this._mozMobileMessage = navigator.mozMobileMessage ||
                    window.DesktopMockNavigatormozMobileMessage;

    this._mozMobileMessage.addEventListener('received',
        this.onMessageReceived.bind(this));
    this._mozMobileMessage.addEventListener('sending', this.onMessageSending);
    this._mozMobileMessage.addEventListener('sent', this.onMessageSent);
    this._mozMobileMessage.addEventListener('failed', this.onMessageFailed);
    window.addEventListener('hashchange', this.onHashChange.bind(this));
    document.addEventListener('mozvisibilitychange',
                              this.onVisibilityChange.bind(this));

    // Callback if needed
    if (typeof callback === 'function') {
      callback();
    }
  },

  onMessageSending: function mm_onMessageSending(e) {
    var message = e.message;
    var threadId = message.threadId;

    if (Threads.has(threadId)) {
      Threads.get(message.threadId).messages.push(message);
    }

    if (window.location.hash === '#new') {
      // If we are in 'new' we go to right to thread view
      window.location.hash = '#thread=' + threadId;
    } else {
      ThreadUI.appendMessage(message);
      ThreadUI.scrollViewToBottom();
    }
    MessageManager.getThreads(ThreadListUI.renderThreads);
  },

  onMessageFailed: function mm_onMessageFailed(e) {
    ThreadUI.onMessageFailed(e.message);
  },

  onMessageSent: function mm_onMessageSent(e) {
    ThreadUI.onMessageSent(e.message);
  },
  // This method fills the gap while we wait for next 'getThreads' request,
  // letting us rendering the new thread with a better performance.
  createThreadMockup: function mm_createThreadMockup(message) {
    // Given a message we create a thread as a mockup. This let us render the
    // thread without requesting Gecko, so we increase the performance and we
    // reduce Gecko requests.
    return {
        id: message.threadId,
        participants: [message.sender],
        body: message.body,
        timestamp: message.timestamp,
        unreadCount: 1,
        lastMessageType: message.type || 'sms'
      };
  },

  onMessageReceived: function mm_onMessageReceived(e) {
    var message = e.message;
    var threadId;

    if (message.messageClass && message.messageClass === 'class-0') {
      return;
    }

    threadId = message.threadId;

    if (Threads.has(threadId)) {
      Threads.get(message.threadId).messages.push(message);
    }

    if (threadId === Threads.currentId) {
      //Append message and mark as unread
      this.markMessagesRead([message.id], true, function() {
        MessageManager.getThreads(ThreadListUI.renderThreads);
      });
      ThreadUI.appendMessage(message);
      ThreadUI.scrollViewToBottom();
      Utils.updateTimeHeaders();
    } else {
      var threadMockup = this.createThreadMockup(message);

      if (!Threads.get(message.threadId)) {
        Threads.set(message.threadId, threadMockup);
        Threads.get(message.threadId).messages.push(message);
      }

      if (ThreadListUI.container.getElementsByTagName('ul').length === 0) {
        ThreadListUI.renderThreads([threadMockup]);
      } else {
        var timestamp = threadMockup.timestamp.getTime();
        var previousThread = document.getElementById('thread-' + threadId);
        if (previousThread && previousThread.dataset.time > timestamp) {
          // If the received SMS it's older that the latest one
          // We need only to update the 'unread status'
          ThreadListUI.mark(threadId, 'unread');
          return;
        }
        // We remove the previous one in order to place the new one properly
        if (previousThread) {
          var threadsInContainer = previousThread.parentNode.children.length;
          if (threadsInContainer === 1) {
            // If it's the last one we should remove the container
            var oldThreadContainer = previousThread.parentNode;
            var oldHeaderContainer = oldThreadContainer.previousSibling;
            ThreadListUI.container.removeChild(oldThreadContainer);
            ThreadListUI.container.removeChild(oldHeaderContainer);
          } else {
            var threadsContainerID = 'threadsContainer_' +
                              Utils.getDayDate(threadMockup.timestamp);
            var threadsContainer =
              document.getElementById(threadsContainerID);
            threadsContainer.removeChild(previousThread);
          }
        }
        ThreadListUI.appendThread(threadMockup);
      }
    }
  },

  onVisibilityChange: function mm_onVisibilityChange(e) {
    LinkActionHandler.resetActivityInProgress();
    ThreadListUI.updateContactsInfo();
    ThreadUI.updateHeaderData();
    Utils.updateTimeHeaders();

    // If we receive a message with screen off, the height is
    // set to 0 and future checks will fail. So we update if needed
    if (!ThreadListUI.fullHeight || ThreadListUI.fullHeight === 0) {
      ThreadListUI.fullHeight = ThreadListUI.container.offsetHeight;
    }
  },

  slide: function mm_slide(direction, callback) {
    var mainWrapper = document.getElementById('main-wrapper');

    // If no sliding is necessary, schedule the callback to be invoked as soon
    // as possible (maintaining the asynchronous API of this method)
    if (mainWrapper.dataset.position === direction) {
      setTimeout(callback);
      return;
    }

    mainWrapper.classList.add('peek');
    mainWrapper.dataset.position = direction;

    // We have 2 panels, so we get 2 transitionend for each step
    var trEndCount = 0;
    mainWrapper.addEventListener('transitionend', function trWait() {
      trEndCount++;

      switch (trEndCount) {
        case 2:
          mainWrapper.classList.remove('peek');
          break;
        case 4:
          mainWrapper.removeEventListener('transitionend', trWait);
          if (callback) {
            callback();
          }
          break;
      }
    });
  },

  onHashChange: function mm_onHashChange(e) {
    var mainWrapper = document.getElementById('main-wrapper');
    var threadMessages = document.getElementById('thread-messages');
    var recipient;

    switch (window.location.hash) {
      case '#new':

        ThreadUI.cleanFields(true);
        mainWrapper.classList.remove('edit');
        threadMessages.classList.add('new');

        MessageManager.activity.recipients = null;

        MessageManager.slide('left', function() {
          ThreadUI.initRecipients();

          if (MessageManager.activity.number ||
              MessageManager.activity.contact) {

            recipient = MessageManager.activity.contact || {
              number: MessageManager.activity.number,
              source: 'manual'
            };

            ThreadUI.recipients.add(recipient);

            MessageManager.activity.number = null;
            MessageManager.activity.contact = null;
          }

          // If the message has a body, use it to popuplate the input field.
          if (MessageManager.activity.body) {
            ThreadUI.setMessageBody(
              MessageManager.activity.body
            );
            MessageManager.activity.body = null;
          }
        });
        break;
      case '#thread-list':
        //Keep the  visible button the :last-child
        var editButton = document.getElementById('icon-edit');
        editButton.parentNode.appendChild(editButton);
        if (mainWrapper.classList.contains('edit')) {
          mainWrapper.classList.remove('edit');
          if (ThreadListUI.editDone) {
            ThreadListUI.editDone = false;
            // TODO Address this re-render in
            // https://bugzilla.mozilla.org/show_bug.cgi?id=825604
            this.getThreads(ThreadListUI.renderThreads,
              function threadListUpdated() {
              WaitingScreen.hide();
            });
          }
        } else if (threadMessages.classList.contains('new')) {
          MessageManager.slide('right', function() {
            threadMessages.classList.remove('new');
          });
        } else {
          // Clear it before sliding.
          ThreadUI.container.textContent = '';

          MessageManager.slide('right', function() {
            if (MessageManager.activity.threadId) {
              window.location.hash =
                '#thread=' + MessageManager.activity.threadId;
              MessageManager.activity.threadId = null;
              MessageManager.activity.isLocked = false;
            }
          });
        }
        break;
      case '#edit':
        ThreadListUI.cleanForm();
        ThreadUI.cleanForm();
        mainWrapper.classList.toggle('edit');
        break;
      default:
        var threadId = Threads.currentId;
        var filter;

        if (threadId) {
          filter = new MozSmsFilter();
          filter.threadId = threadId;

          if (mainWrapper.classList.contains('edit')) {
            mainWrapper.classList.remove('edit');
          } else if (threadMessages.classList.contains('new')) {
            // After a message is sent...
            //
            threadMessages.classList.remove('new');

            ThreadUI.updateHeaderData(function() {
              ThreadUI.renderMessages(filter);
            });
          } else {
            // Viewing received messages...
            //
            ThreadListUI.mark(threadId, 'read');

            // Update Header
            ThreadUI.updateHeaderData(function updateHeader() {
              MessageManager.slide('left', function slideEnd() {
                ThreadUI.renderMessages(filter);
              });
            });
          }
        }
      break;
    }
  },

  getThreads: function mm_getThreads(callback, extraArg) {
    var cursor = this._mozMobileMessage.getThreads(),
        threads = [];

    cursor.onsuccess = function onsuccess() {
      if (this.result) {
        threads.push(this.result);

        // Register all threads to the Threads object.
        Threads.set(this.result.id, this.result);

        // If one of the requested threads is also the
        // currently displayed thread, update the header immediately
        if (this.result.id === Threads.currentId) {
          ThreadUI.updateHeaderData();
        }

        this.continue();
        return;
      }
      if (callback) {
        callback(threads, extraArg);
      }
    };

    cursor.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + this.error.name;
      console.log(msg);
    };
  },

  getMessage: function mm_getMsg(id) {
    return this._mozMobileMessage.getMessage(id);
  },

  getMessages: function mm_getMgs(options) {
    /*
    options {
      each: callback function invoked for each message
      end: callback function invoked when cursor is "done"
      endArgs: specify arguments for the "end" callback
      filter: a MozMessageFilter or similar object
      invert: option to invert the selection
    }

     */
    var each = options.each;
    var filter = options.filter;
    var invert = options.invert;
    var end = options.end;
    var endArgs = options.endArgs;
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
        }
      } else {
        if (end) {
          end(endArgs);
        }
      }
    };
    cursor.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + this.error.name;
      console.log(msg);
    };
  },

  // consider splitting this method for the different use cases
  send: function mm_send(recipients, msgContent, onsuccess, onerror) {
    var isMMS = false;
    var isGroup = false;
    var isSMILCandidate = false;
    var message, request;

    // When there are > 1 recipients specified for a message,
    // use MMS Group Messaging.
    // if (recipients.length > 1) {
    //   isMMS = true;
    //   msgContent = [{
    //     text: msgContent
    //   }];
    // }

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    if (Array.isArray(msgContent)) {
      isMMS = true;
      isSMILCandidate = true;
    }

    message = isSMILCandidate ?
      SMIL.generate(msgContent) : msgContent;

    if (recipients.length > 1) {
      isGroup = true;
    }

   if (isMMS) {
      request = this._mozMobileMessage.sendMMS({
        subject: '',
        receivers: recipients,
        smil: message.smil,
        attachments: message.attachments
      });
    } else {
      // For this case, "recipients" may
      // only have a single entry.
      request = this._mozMobileMessage.send(
        recipients, message
      );
    }

    request.onsuccess = function onSuccess(event) {
      onsuccess && onsuccess(event.result);
    };

    request.onerror = function onError(event) {
      console.log('Error Sending: ' + JSON.stringify(event.error));
      onerror && onerror();
    };

    if (isGroup && !isMMS) {
      window.location.hash = '#thread-list';
    }
  },

  deleteMessage: function mm_deleteMessage(id, callback) {
    var req = this._mozMobileMessage.delete(id);
    req.onsuccess = function onsuccess() {
      callback && callback(this.result);
    };

    req.onerror = function onerror() {
      var msg = 'Deleting in the database. Error: ' + req.error.name;
      console.log(msg);
      callback && callback(null);
    };
  },

  /*
    TODO: If the messages could not be deleted completely,
    conversation list page will also update without notification currently.
    May need more infomation for user that the messages were not
    removed completely.
  */
  deleteMessages: function mm_deleteMessages(list, callback) {
    if (list.length > 0) {
      this.deleteMessage(list.shift(), function(result) {
        this.deleteMessages(list, callback);
      }.bind(this));
    } else {
      if (callback) {
        callback();
      }
    }
  },

  markMessagesRead: function mm_markMessagesRead(list, value, callback) {
    if (!this._mozMobileMessage || !list.length) {
      return;
    }

    // We chain the calls to the API in a way that we make no call to
    // 'markMessageRead' until a previous call is completed. This way any
    // other potential call to the API, like the one for getting a message
    // list, could be done within the calls to mark the messages as read.
    var req = this._mozMobileMessage.markMessageRead(list.pop(), value);

    req.onsuccess = (function onsuccess() {
      if (!list.length && callback) {
        callback(req.result);
        return;
      }
      this.markMessagesRead(list, value, callback);
    }).bind(this);

    req.onerror = function onerror() {
      if (callback) {
        callback(null);
      }
    };
  }
};

/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {

  activity: null,

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
    // Initialize DOM elements which will be used in this code
    [
      'main-wrapper', 'thread-messages'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById(id);
    }, this);
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

    // Here we can only have one sender, so deliveryStatus[0] => message
    // status from sender. Ignore 'pending' messages that are received
    // this means we are in automatic download mode
    if (message.delivery === 'not-downloaded' &&
        message.deliveryStatus[0] === 'pending') {
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
      ThreadListUI.fullHeight = ThreadListUI.view.offsetHeight;
    }
  },

  slide: function mm_slide(direction, callback) {
    // If no sliding is necessary, schedule the callback to be invoked as soon
    // as possible (maintaining the asynchronous API of this method)
    if (this.mainWrapper.dataset.position === direction) {
      setTimeout(callback);
      return;
    }

    this.mainWrapper.classList.add('peek');
    this.mainWrapper.dataset.position = direction;
    var self = this;
    // We have 2 panels, so we get 2 transitionend for each step
    var trEndCount = 0;
    this.mainWrapper.addEventListener('transitionend', function trWait() {
      trEndCount++;

      switch (trEndCount) {
        case 2:
          self.mainWrapper.classList.remove('peek');
          break;
        case 4:
          self.mainWrapper.removeEventListener('transitionend', trWait);
          if (callback) {
            callback();
          }
          break;
      }
    });
  },

  launchComposer: function mm_openComposer(activity) {
    // Do we have to handle a pending activity?
    ThreadUI.cleanFields(true);
    Compose.clear();
    this.threadMessages.classList.add('new');

    var self = this;
    MessageManager.slide('left', function() {
      ThreadUI.initRecipients();
      if (!activity) {
        return;
      }

      if (activity.number || activity.contact) {
        var recipient = activity.contact || {
          number: activity.number,
          source: 'manual'
        };

        ThreadUI.recipients.add(recipient);
      }

      // If the message has a body, use it to populate the input field.
      if (activity.body) {
        ThreadUI.setMessageBody(
          activity.body
        );
      }
      // Clean activity object
      self.activity = null;
    });
  },

  onHashChange: function mm_onHashChange(e) {
    // Group Participants should never persist any hash changes
    ThreadUI.groupView.reset();

    // Leave the edit mode before transitioning to another panel. This is safe
    // to do even if we're not in edit mode as it's essentially a no-op then.
    ThreadUI.cancelEdit();
    ThreadListUI.cancelEdit();

    switch (window.location.hash) {
      case '#new':
        this.launchComposer(this.activity);
        break;
      case '#thread-list':
        ThreadUI.inThread = false;
        var self = this;
        //Keep the  visible button the :last-child
        var editButton = document.getElementById('messages-edit-icon');
        editButton.parentNode.appendChild(editButton);
        if (this.threadMessages.classList.contains('new')) {
          MessageManager.slide('right', function() {
            self.threadMessages.classList.remove('new');
          });
        } else {
          // Clear it before sliding.
          ThreadUI.container.textContent = '';
          var self = this;
          MessageManager.slide('right', function() {
            if (self.activity && self.activity.threadId) {
              window.location.hash = '#thread=' + self.activity.threadId;
              self.activity = null;
            }
          });
        }
        break;
      case '#group-view':
        ThreadUI.groupView();
        break;
      default:
        var threadId = Threads.currentId;
        var filter;

        if (threadId) {
          filter = new MozSmsFilter();
          filter.threadId = threadId;

          if (this.threadMessages.classList.contains('new')) {
            // After a message is sent...
            //
            this.threadMessages.classList.remove('new');

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
                // hashchanges from #group-view back to #thread=n
                // are considered "in thread" and should not
                // trigger a complete re-rendering of the messages
                // in the thread.
                if (!ThreadUI.inThread) {
                  ThreadUI.inThread = true;
                  ThreadUI.renderMessages(filter);
                }
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
      var msg = 'Reading the database. Error: ' + cursor.error.name;
      console.log(msg);
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
      var msg = 'Reading the database. Error: ' + cursor.error.name;
      console.log(msg);
    };
  },

  // consider splitting this method for the different use cases
  sendSMS: function mm_send(recipients, content, onsuccess, onerror) {
    var request;

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    request = this._mozMobileMessage.send(recipients, content);

    request.onsuccess = function onSuccess(event) {
      onsuccess && onsuccess(event.result);
    };

    request.onerror = function onError(event) {
      console.log('Error Sending: ' + JSON.stringify(event.error));
      onerror && onerror();
    };
  },

  sendMMS: function mm_sendMMS(recipients, content, onsuccess, onerror) {
    var request;

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    var message = SMIL.generate(content);

    request = this._mozMobileMessage.sendMMS({
      subject: '',
      receivers: recipients,
      smil: message.smil,
      attachments: message.attachments
    });

    request.onsuccess = function onSuccess(event) {
      onsuccess && onsuccess(event.result);
    };

    request.onerror = function onError(event) {
      console.log('Error Sending: ' + JSON.stringify(event.error));
      onerror && onerror();
    };
  },

  // takes a formatted message in case you happen to have one
  resendMessage: function mm_resendMessage(message) {
    if (message.type === 'sms') {
      return this._mozMobileMessage.send(message.receiver, message.body);
    }
    if (message.type === 'mms') {
      return this._mozMobileMessage.sendMMS({
        receivers: message.receivers,
        subject: message.subject,
        smil: message.smil,
        attachments: message.attachments
      });
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
    // mozMobileMessage.delete() has been modified per bug 771458.
    // Now deleteMessage() can take an id or an array of id.
    this.deleteMessage(list, callback);
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

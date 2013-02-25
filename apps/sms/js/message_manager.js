/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  init: function mm_init(callback) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    // Allow for stubbing in environments that do not implement the
    // `navigator.mozSms` API
    this._mozSms = navigator.mozSms || window.MockNavigatormozSms;

    this._mozSms.addEventListener('received',
        this.onMessageReceived.bind(this));
    this._mozSms.addEventListener('sending', this.onMessageSending);
    this._mozSms.addEventListener('sent', this.onMessageSent);
    this._mozSms.addEventListener('failed', this.onMessageFailed);
    window.addEventListener('hashchange', this.onHashChange.bind(this));
    document.addEventListener('mozvisibilitychange',
                              this.onVisibilityChange.bind(this));
    this.fullHeight = ThreadListUI.view.offsetHeight;
    // Callback if needed
    if (callback && typeof callback === 'function') {
      callback();
    }
  },

  onMessageSending: function mm_onMessageSending(e) {
    var message = e.message;
    var num = message.receiver;
    if (window.location.hash == '#new') {
      // If we are in 'new' we go to the right thread
      // 'num' has been internationalized by Gecko
      window.location.hash = '#num=' + num;
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
  // This method fills the gap while we wait for next 'getThreadList' request,
  // letting us rendering the new thread with a better performance.
  createThreadMockup: function mm_createThreadMockup(message) {
    // Given a message we create a thread as a mockup. This let us render the
    // thread without requesting Gecko, so we increase the performance and we
    // reduce Gecko requests.
    return {
        senderOrReceiver: message.sender,
        body: message.body,
        timestamp: message.timestamp,
        unreadCount: 1
      };
  },

  onMessageReceived: function mm_onMessageReceived(e) {
    var message = e.message;

    var num;
    if (this.currentNum) {
      num = this.currentNum;
    }

    var sender = message.sender;
    if (num && num === sender) {
      //Append message and mark as unread
      this.markMessagesRead([message.id], true, function() {
        MessageManager.getThreads(ThreadListUI.renderThreads);
      });
      ThreadUI.appendMessage(message);
      ThreadUI.scrollViewToBottom();
      Utils.updateTimeHeaders();
    } else {
      var threadMockup = this.createThreadMockup(message);
      if (ThreadListUI.view.getElementsByTagName('ul').length === 0) {
        ThreadListUI.renderThreads([threadMockup]);
      } else {
        var num = threadMockup.senderOrReceiver;
        var timestamp = threadMockup.timestamp.getTime();
        var previousThread = document.getElementById('thread_' + num);
        if (previousThread && previousThread.dataset.time > timestamp) {
          // If the received SMS it's older that the latest one
          // We need only to update the 'unread status'
          previousThread.getElementsByTagName('a')[0].classList
                    .add('unread');
          return;
        }
        // We remove the previous one in order to place the new one properly
        if (previousThread) {
          var threadsInContainer = previousThread.parentNode.children.length;
          if (threadsInContainer === 1) {
            // If it's the last one we should remove the container
            var oldThreadContainer = previousThread.parentNode;
            var oldHeaderContainer = oldThreadContainer.previousSibling;
            ThreadListUI.view.removeChild(oldThreadContainer);
            ThreadListUI.view.removeChild(oldHeaderContainer);
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
    ThreadListUI.updateContactsInfo();
    ThreadUI.updateHeaderData();
    Utils.updateTimeHeaders();
  },

  slide: function mm_slide(callback) {
    var mainWrapper = document.getElementById('main-wrapper');

    mainWrapper.classList.add('peek');
    mainWrapper.dataset.position = (mainWrapper.dataset.position == 'left') ?
                                   'right' : 'left';

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
    switch (window.location.hash) {
      case '#new':
        var messageInput = document.getElementById('message-to-send');
        var receiverInput = document.getElementById('receiver-input');
        //Keep the  visible button the :last-child
        var contactButton = document.getElementById('icon-contact');
        contactButton.parentNode.appendChild(contactButton);
        document.getElementById('messages-container').innerHTML = '';
        ThreadUI.cleanFields();
        MessageManager.currentNum = null;
        threadMessages.classList.add('new');
        MessageManager.slide(function() {
          receiverInput.focus();
        });
        break;
      case '#thread-list':
        //Keep the  visible button the :last-child
        var editButton = document.getElementById('icon-edit');
        editButton.parentNode.appendChild(editButton);
        MessageManager.currentNum = null;
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
          MessageManager.slide(function() {
            threadMessages.classList.remove('new');
          });
        } else {
          MessageManager.slide(function() {
            ThreadUI.view.innerHTML = '';
            if (MessageManager.activityTarget) {
              window.location.hash =
                '#num=' + MessageManager.activityTarget;
              delete MessageManager.activityTarget;
              delete MessageManager.lockActivity;
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
        var num = this.getNumFromHash();
        if (num) {
          var filter = this.createFilter(num);
          var messageInput = document.getElementById('message-to-send');
          MessageManager.currentNum = num;
          if (mainWrapper.classList.contains('edit')) {
            mainWrapper.classList.remove('edit');
          } else if (threadMessages.classList.contains('new')) {
            ThreadUI.renderMessages(filter);
            threadMessages.classList.remove('new');
            ThreadUI.updateHeaderData();
          } else {
            // As soon as we click in the thread, we visually mark it
            // as read.
            var threadRead = document.getElementById('thread_' + num);
            if (threadRead) {
              threadRead.getElementsByTagName('a')[0].classList
                    .remove('unread');
            }

            var self = this;
            // Update Header
            ThreadUI.updateHeaderData(function headerReady() {
              MessageManager.slide(function slided() {
                ThreadUI.renderMessages(filter);
              });
            });
          }
        }
      break;
    }
  },

  createFilter: function mm_createFilter(num) {
    var filter = new MozSmsFilter();
    filter.numbers = [num || ''];
    return filter;
  },

  getNumFromHash: function mm_getNumFromHash() {
    var num = /\bnum=(.+)(&|$)/.exec(window.location.hash);
    return num ? num[1] : null;
  },

  getThreads: function mm_getThreads(callback, extraArg) {
    var request = this._mozSms.getThreadList();
    request.onsuccess = function onsuccess(evt) {
      var threads = evt.target.result;
      if (callback) {
        callback(threads, extraArg);
      }
    };

    request.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + request.error.name;
      console.log(msg);
    };
  },
  getMessages: function mm_getMgs(options) {
    var stepCB = options.stepCB, // CB which manage every message
        filter = options.filter, // mozMessageFilter
        invert = options.invert, // invert selection
        endCB = options.endCB,   // CB when all messages retrieved
        endCBArgs = options.endCBArgs; //Args for endCB
    var self = this;
    var request = this._mozSms.getMessages(filter, !invert);
    request.onsuccess = function onsuccess() {
      var cursor = request.result;
      if (cursor.message) {
        var shouldContinue = true;
        if (stepCB) {
          shouldContinue = stepCB(cursor.message);
        }
        // if stepCB returns false the iteration stops
        if (shouldContinue !== false) { // if this is undefined this is fine
          cursor.continue();
        }
      } else {
        if (endCB) {
          endCB(endCBArgs);
        }
      }
    };
    request.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + request.error.name;
      console.log(msg);
    };
  },
  send: function mm_send(number, text, callback, errorHandler) {
    var req = this._mozSms.send(number, text);
    req.onsuccess = function onsuccess(e) {
      callback && callback(req.result);
    };

    req.onerror = function onerror(e) {
      errorHandler && errorHandler(number);
    };
  },

  deleteMessage: function mm_deleteMessage(id, callback) {
    var req = this._mozSms.delete(id);
    req.onsuccess = function onsuccess() {
      callback && callback(req.result);
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
    } else
      callback();
  },

  markMessagesRead: function mm_markMessagesRead(list, value, callback) {
    if (!navigator.mozSms || !list.length) {
      return;
    }

    // We chain the calls to the API in a way that we make no call to
    // 'markMessageRead' until a previous call is completed. This way any
    // other potential call to the API, like the one for getting a message
    // list, could be done within the calls to mark the messages as read.
    var req = this._mozSms.markMessageRead(list.pop(), value);
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



/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  init: function mm_init() {
    ThreadUI.init();
    ThreadListUI.init();
    this.getMessages(ThreadListUI.renderThreads);

    if (navigator.mozSms) {
      navigator.mozSms.addEventListener('received', this);
    }
    window.addEventListener('hashchange', this);
    document.addEventListener('mozvisibilitychange', this);
  },
  handleEvent: function mm_handleEvent(event) {
    switch (event.type) {
      case 'received':
        this.getMessages(ThreadListUI.renderThreads);
        var num = this.getNumFromHash();
        if (num) {
          //Append message
          ThreadUI.appendMessage(event.message);
        }
        break;

      case 'hashchange':
        var bodyclassList = document.body.classList;
        switch (window.location.hash) {
          case '':
            // this.getMessages(ThreadListUI.renderThreads);
            bodyclassList.remove('conversation');
            bodyclassList.remove('conversation-new-msg');
            break;
          case '#edit':
            //TODO Add new style management
            break;
          default:
            var num = this.getNumFromHash();
            alert(num);

            if (num) {
              ThreadUI.cleanFields();
              if (num == '*') {
                document.body.classList.add('conversation-new-msg');
                document.body.classList.add('conversation');
              }else {
                var filter = this.createFilter(num);
                this.getMessages(ThreadUI.renderMessages, filter);
                document.body.classList.remove('conversation-new-msg');
                document.body.classList.add('conversation');
              }
            }
          break;
        }
        break;
      case 'mozvisibilitychange':
        if (!document.mozHidden) {
          this.getMessages(ThreadListUI.renderThreads);
          var num = this.getNumFromHash();
          if (num) {
            var filter = this.createFilter(num);
            this.getMessages(ThreadUI.renderMessages, filter);
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
  // Retrieve messages from DB and execute callback
  getMessages: function mm_getMessages(callback, filter, invert) {
    var request = navigator.mozSms.getMessages(filter, !invert);
    var self = this;
    var messages = [];
    request.onsuccess = function onsuccess() {
      var cursor = request.result;
      if (cursor.message) {
        messages.push(cursor.message);
        cursor.continue();
      } else {
        // TODO Add call to Steve JS for adding 'Pending Messages'
        callback(messages);
      }
    };

    request.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + request.errorCode;
      console.log(msg);
    };
  },

  send: function mm_send(number, text, callback) {
    var req = navigator.mozSms.send(number, text);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
      callback(null);
    };
  },

  deleteMessage: function mm_deleteMessage(id, callback) {
    var req = navigator.mozSms.delete(id);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
      var msg = 'Deleting in the database. Error: ' + req.errorCode;
      console.log(msg);
      callback(null);
    };
  },

  /*
    TODO: If the messages could not be deleted completely,
    conversation list page will also update withot notification currently.
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

  markMessageRead: function mm_markMessageRead(id, value, callback) {
    var req = navigator.mozSms.markMessageRead(id, value);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
      var msg = 'Mark message error in the database. Error: ' + req.errorCode;
      console.log(msg);
      callback(null);
    };
  },

  markMessagesRead: function mm_markMessagesRead(list, value, callback) {
    if (list.length > 0) {
      this.markMessageRead(list.shift(), value, function markReadCb(result) {
        this.markMessagesRead(list, value, callback);
      }.bind(this));
    } else {
      callback();
    }
  }
};

var ThreadListUI = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('msg-conversations-list');
  },

  init: function thlui_init() {
    this.delNumList = [];
  },

  updateMsgWithContact: function thlui_updateMsgWithContact(contact) {
    // TODO Update DOM with data retrieved from Contact DB
    // This will be a callback from ContactManager
  },

  renderThreads: function thlui_renderThreads(messages) {
    ThreadListUI.view.innerHTML = '';
    var threadIds = [], headerIndex;
    for (var i = 0; i < messages.length; i++) {
      var num = messages[i].delivery == 'received' ?
      messages[i].sender : messages[i].receiver;
      if (threadIds.indexOf(num) == -1) {
        var thread = {
          'body': messages[i].body,
          'name': num,
          'num': num,
          'timestamp': messages[i].timestamp.getTime(),
          'unreadCount': !messages[i].read ? 1 : 0,
          'id': num
        };
        if (threadIds.length == 0) {
          var currentTS = (new Date()).getTime();
          headerIndex = Utils.getDayDate(currentTS);
          ThreadListUI.createNewHeader(currentTS);
        }else {
          var tmpIndex = Utils.getDayDate(messages[i].timestamp.getTime());
          if (tmpIndex < headerIndex) {
            ThreadListUI.createNewHeader(messages[i].timestamp.getTime());
            headerIndex = tmpIndex;
          }
        }
        threadIds.push(num);
        ThreadListUI.appendThread(thread);
      }
    }
  },
  appendThread: function thlui_appendThread(thread) {
    // Create DOM element
    var threadHTML = document.createElement('div');
    threadHTML.classList.add('item');

    // Retrieve info from thread
    var dataName = Utils.escapeHTML(thread.name ||
                                    thread.num, true);
    var name = Utils.escapeHTML(thread.name);
    var bodyText = thread.body.split('\n')[0];
    var bodyHTML = Utils.escapeHTML(bodyText);
    // Create HTML structure
    var structureHTML = '  <a href="#num=' + thread.num + '"' +
            '     data-num="' + thread.num + '"' +
            '     data-name="' + dataName + '"' +
            '     data-notempty="' +
                  (thread.timestamp ? 'true' : '') + '"' +
            '     class="' +
                 (thread.unreadCount > 0 ? 'unread' : '') + '">' +
            '    <span class="unread-mark">' +
            '      <i class="i-unread-mark"></i>' +
            '    </span>' +
            '    <div class="name">' + name + '</div>' +
                (!thread.timestamp ? '' :
            '    <div class="time ' +
                  (thread.unreadCount > 0 ? 'unread' : '') +
            '      " data-time="' + thread.timestamp + '">' +
                  Utils.getHourMinute(thread.timestamp) +
            '    </div>') +
            '    <div class="msg">"' + bodyHTML + '"</div>' +
            '    <div class="unread-tag"></div>' +
            '    <div class="photo"></div>' +
            '  </a>';
    // Update HTML and append
    threadHTML.innerHTML = structureHTML;
    this.view.appendChild(threadHTML);
  },
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createNewHeader: function thlui_createNewHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('div');
    headerHTML.classList.add('groupHeader');

    // Create HTML and append
    var structureHTML = Utils.getHeaderDate(timestamp);
    headerHTML.innerHTML = structureHTML;
    ThreadListUI.view.appendChild(headerHTML);
  }
};

var ThreadUI = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('view-list');
  },

  get num() {
    delete this.number;
    return this.number = document.getElementById('view-num');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('view-name');
  },

  get input() {
    delete this.input;
    return this.input = document.getElementById('view-msg-text');
  },

  get sendButton() {
    delete this.sendButton;
    return this.sendButton = document.getElementById('view-msg-send');
  },
  init: function thui_init() {
    this.delNumList = [];
    this.headerIndex = 0;

    this.sendButton.addEventListener('click', this.sendMessage.bind(this));
    this.input.addEventListener('input', this.updateInputHeight.bind(this));
    this.view.addEventListener('click', this);

    var windowEvents = ['resize', 'keyup', 'transitionend'];
    windowEvents.forEach(function(eventName) {
      window.addEventListener(eventName, this);
    }, this);
  },

  scrollViewToBottom: function thui_scrollViewToBottom(animateFromPos) {
    if (!animateFromPos) {
      this.view.scrollTop = this.view.scrollHeight;
      return;
    }

    clearInterval(this.viewScrollingTimer);
    this.view.scrollTop = animateFromPos;
    this.viewScrollingTimer = setInterval((function scrollStep() {
      var view = this.view;
      var height = view.scrollHeight - view.offsetHeight;
      if (view.scrollTop === height) {
        clearInterval(this.viewScrollingTimer);
        return;
      }
      view.scrollTop += Math.ceil((height - view.scrollTop) / 2);
    }).bind(this), 100);

  },

  updateInputHeight: function thui_updateInputHeight() {
    var input = this.input;
    input.style.height = null;
    input.style.height = input.scrollHeight + 12 + 'px';

    var newHeight = input.getBoundingClientRect().height;
    var bottomToolbarHeight = (newHeight + 32) + 'px';
    var bottomToolbar =
        document.getElementById('view-bottom-toolbar');

    bottomToolbar.style.height = bottomToolbarHeight;

    this.view.style.bottom = bottomToolbarHeight;
    this.scrollViewToBottom();
  },
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createHeader: function thui_createHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('div');
    headerHTML.classList.add('groupHeader');

    // Create HTML and append
    var structureHTML = Utils.getHeaderDate(timestamp);
    headerHTML.innerHTML = structureHTML;
    ThreadUI.view.appendChild(headerHTML);
  },
  renderMessages: function thui_renderMessages(messages) {
    // Update Header
    ThreadUI.title.innerHTML = MessageManager.getNumFromHash();
    // Sorting messages reverse
    messages.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });
    // Clean list of messages
    ThreadUI.view.innerHTML = '';
    // Update header index
    ThreadUI.headerIndex = 0;
    // Per each message I will append DOM element
    for (var i = 0; i < messages.length; i++) {
      ThreadUI.appendMessage(messages[i]);
    }
  },
  appendMessage: function thui_appendMessage(message) {
    // Create DOM Element
    var messageDOM = document.createElement('div');
    // Add class
    messageDOM.classList.add('message-block');
    // Get data for rendering
    var outgoing = (message.delivery == 'sent' ||
      message.delivery == 'sending');
    var className = (outgoing ? 'sender' : 'receiver') + '"';
    var timestamp = message.timestamp.getTime();
    // Create HTML structure
    var htmlStructure = '  <div class="message-container ' + className + '>' +
               '    <div class="message-bubble"></div>' +
               '    <div class="time" data-time="' + timestamp + '">' +
                      Utils.getHourMinute(message.timestamp) +
               '    </div>' +
               '    <div class="text">' + message.body + '</div>' +
               '  </div>';
    messageDOM.innerHTML = htmlStructure;
    //Check if we need a new header
    var tmpIndex = Utils.getDayDate(timestamp);
    if (tmpIndex > ThreadUI.headerIndex) {
      ThreadUI.createHeader(timestamp);
      ThreadUI.headerIndex = tmpIndex;
    }
    // Append element
    ThreadUI.view.appendChild(messageDOM);
    // Scroll to bottom
    this.scrollViewToBottom();
  },
  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'keyup':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          return;

        if (this.close())
          evt.preventDefault();
        break;

      case 'transitionend':
        if (document.body.classList.contains('conversation'))
          return;

        this.view.innerHTML = '';
        break;

      case 'resize':
        if (!document.body.classList.contains('conversation'))
          return;

        this.updateInputHeight();
        this.scrollViewToBottom();
        break;
    }
  },
  close: function thui_close() {
    if (!document.body.classList.contains('conversation') &&
        !window.location.hash)
      return false;

    window.location.hash = '';
    return true;
  },
  cleanFields: function thui_cleanFields() {
    this.num.value = '';
    this.input.value = '';
  },
  sendMessage: function thui_sendMessage() {
    // Retrieve num depending on hash
    var hashNum = MessageManager.getNumFromHash();
    // Depending where we are, we get different num
    if (hashNum == '*') {
      var num = this.num.value;
    } else {
      var num = hashNum;
    }
    // Retrieve text
    var text = this.input.value;
    // If we have something to send
    if (num != '' && text != '') {
      if (hashNum == '*') {
        ThreadUI.title.innerHTML = num;
        document.body.classList.remove('conversation-new-msg');
      }
      // Create 'PendingMessage'
      var message = {
        sender: null,
        receiver: num,
        delivery: 'sending',
        body: text,
        timestamp: new Date()
      };
      // Append to DOM
      this.appendMessage(message);

      // TODO Append to Steve class
      // TODO Once Steve code land, we will change hash to 'num='+num
      // directly

      // Clean Fields
      ThreadUI.cleanFields();
      MessageManager.send(num, text, function() {
        //TODO Remove 'pending' from Steve class

        // TODO move when Steve code will be landed
        if (window.location.hash == '#num=*') {
          window.location.hash = '#num=' + num;
        } else {
          MessageManager.getMessages(ThreadListUI.renderThreads);
        }
        MessageManager.getMessages(ThreadListUI.renderThreads);

      });
    }


  }
};

window.addEventListener('localized', function showBody() {
  MessageManager.init();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  var number = activity.source.data.number;
  var displayThread = function actHandleDisplay() {
    if (number)
      window.location.hash = '#num=' + number;
  }

  if (document.readyState == 'complete') {
    displayThread();
  } else {
    window.addEventListener('localized', function loadWait() {
      window.removeEventListener('localized', loadWait);
      displayThread();
    });
  }

  activity.postResult({ status: 'accepted' });
});

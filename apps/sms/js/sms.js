/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  init: function mm_init() {
    ThreadUI.init();
    ThreadListUI.init();

    if (navigator.mozSms) {
      navigator.mozSms.addEventListener('received', this);
    }
    window.addEventListener('hashchange', this);
    document.addEventListener('mozvisibilitychange', this);
  },
  handleEvent: function mm_handleEvent(event) {
    switch (event.type) {
      case 'received':
        ThreadListUI.renderThreads(event.message);
        var msg = event.message;
        if (ThreadUI.filter && ThreadUI.filter == msg.sender) {
          ThreadUI.renderMessages(ThreadUI.filter);
        }
        break;

      case 'hashchange':
        var bodyclassList = document.body.classList;
        switch (window.location.hash) {
          case '':
            bodyclassList.remove('msg-search-mode');
            bodyclassList.remove('edit-mode');
            if (!bodyclassList.contains('msg-search-result-mode') &&
                !bodyclassList.contains('conversation'))
              return;

            ThreadListUI.renderThreads();
            bodyclassList.remove('conversation');
            bodyclassList.remove('conversation-new-msg');
            break;
          case '#edit':  // Edit mode with all conversations.
            bodyclassList.add('edit-mode');
            bodyclassList.remove('msg-search-mode');
            break;
          default:
            var num = this.getNumFromHash();
            if (num) {
              ThreadUI.renderMessages(num);
            }
          break;
        }
        break;
      case 'mozvisibilitychange':
        if (!document.mozHidden) {
          ThreadListUI.renderThreads();
          var num = this.getNumFromHash();
          if (num) {
            ThreadUI.renderMessages(num);
          }
        }
        break;
    }
  },
  getNumFromHash: function thui_getNumFromHash() {
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
    this.renderThreads();
  },

  updateMsgWithContact: function thlui_updateMsgWithContact(contact) {
    // TODO Update DOM with data retrieved from Contact DB
    // This will be a callback from ContactManager
  },

  renderThreads: function thlui_renderThreads(pendingMsg) {
    var self = this;
    this._lastHeader = undefined;
    /*
      TODO: Conversation list is always order by contact family names
      not the timestamp.
      It should be timestamp in normal view, and order by name while searching
    */
    MessageManager.getMessages(function getMessagesCallback(messages) {
      var conversations = {};
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];

        // XXX why does this happen?
        if (!message.delivery)
          continue;

        var num = message.delivery == 'received' ?
                  message.sender : message.receiver;

        var read = message.read;
        var conversation = conversations[num];
        if (conversation) {
          conversation.unreadCount += !read ? 1 : 0;
          continue;
        }

        conversations[num] = {
          'body': message.body,
          'name': num,
          'num': num,
          'timestamp': message.timestamp.getTime(),
          'unreadCount': !read ? 1 : 0,
          'id': i
        };
      }

      var fragment = '';
      for (var num in conversations) {
        conversation = conversations[num];
        if (self.delNumList.indexOf(conversation.num) > -1) {
          continue;
        }

        // Add a grouping header if necessary
        var header = self.createNewHeader(conversation);
        if (header != null) {
          fragment += header;
        }
        fragment += self.createNewConversation(conversation);
      }

      self.view.innerHTML = fragment;
      delete self._lastHeader;
      var conversationList = self.view.children;

    }, null);
  },

  createNewConversation: function thlui_createNewConversation(conversation) {
    var dataName = Utils.escapeHTML(conversation.name ||
                                    conversation.num, true);
    var name = Utils.escapeHTML(conversation.name);
    var bodyText = conversation.body.split('\n')[0];
    var bodyHTML = Utils.escapeHTML(bodyText);

    return '<div class="item">' +
           '  <label class="fake-checkbox">' +
           '    <input data-num="' +
                conversation.num + '"' + 'type="checkbox"/>' +
           '    <span></span>' +
           '  </label>' +
           '  <a href="#num=' + conversation.num + '"' +
           '     data-num="' + conversation.num + '"' +
           '     data-name="' + dataName + '"' +
           '     data-notempty="' +
                 (conversation.timestamp ? 'true' : '') + '"' +
           '     class="' +
                 (conversation.unreadCount > 0 ? 'unread' : '') + '">' +
           '    <span class="unread-mark">' +
           '      <i class="i-unread-mark"></i>' +
           '    </span>' +
           '    <div class="name">' + name + '</div>' +
                (!conversation.timestamp ? '' :
           '    <div class="time ' +
                  (conversation.unreadCount > 0 ? 'unread' : '') +
           '      " data-time="' + conversation.timestamp + '">' +
                  Utils.getHourMinute(conversation.timestamp) +
           '    </div>') +
           '    <div class="msg">"' + bodyHTML + '"</div>' +
           '    <div class="unread-tag"></div>' +
           '    <div class="photo"></div>' +
           '  </a>' +
           '</div>';
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createNewHeader: function thlui_createNewHeader(conversation) {
    function sameDay(timestamp1, timestamp2) {
      var day1 = new Date(timestamp1);
      var day2 = new Date(timestamp2);

      return day1.getFullYear() == day2.getFullYear() &&
             day1.getMonth() == day2.getMonth() &&
             day1.getDate() == day2.getDate();
    };

    if (this._lastHeader && sameDay(this._lastHeader, conversation.timestamp)) {
      return null;
    }

    this._lastHeader = conversation.timestamp;

    return '<div class="groupHeader">' +
      Utils.getHeaderDate(conversation.timestamp) + '</div>';
  },
  executeMessageDelete: function thlui_executeMessageDelete() {
    var delList = this.view.querySelectorAll('input[type=checkbox][data-num]');
    var delNum = [];
    for (var elem in delList) {
      if (delList[elem].checked) {
        delNum.push(delList[elem].dataset.num);
      }
    }
    this.deleteMessages(delNum);
    this.delNumList = [];
  },

  executeAllMessagesDelete: function thlui_executeAllMessagesDelete() {
    // Clean current list in case messages checked
    this.delNumList = [];

    var inputs = this.view.getElementsByTagName('a');
    for (var i = 0; i < inputs.length; i++) {
      this.delNumList.push(inputs[i].dataset.num);
    }

    this.executeMessageDelete();
    this.hideConfirmationDialog();
  },

  showConfirmationDialog: function thlui_showConfirmationDialog() {
    var dialog = document.getElementById('msg-confirmation-panel');
    dialog.removeAttribute('hidden');
  },

  hideConfirmationDialog: function thlui_hideConfirmationDialog() {
    var dialog = document.getElementById('msg-confirmation-panel');
    dialog.setAttribute('hidden', 'true');
  },

  deleteMessages: function thlui_deleteMessages(numberList) {
    if (numberList == [])
      return;

    var self = this;
    var filter = new MozSmsFilter();
    filter.numbers = numberList;

    MessageManager.getMessages(function mm_getMessages(messages) {
      var msgs = [];
      for (var i = 0; i < messages.length; i++) {
        msgs.push(messages[i].id);
      }
      MessageManager.deleteMessages(msgs,
                                    this.renderThreads.bind(this));
    }.bind(this), filter);

    window.location.hash = '#';
  },

  onListItemClicked: function thlui_onListItemClicked(evt) {
    var cb = evt.target.getElementsByClassName('fake-checkbox')[0];
    if (!cb || !document.body.classList.contains('edit-mode')) {
      return;
    }
    evt.preventDefault();

    var nums = this.delNumList;
    cb.checked = !cb.checked;
    if (cb.checked) {
      nums.push(evt.target.dataset.num);
    } else {
      nums.splice(nums.indexOf(evt.target.dataset.num), 1);
    }
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

  renderMessages: function thui_renderMessages(num, pendingMsg) {
    delete ThreadListUI._lastHeader;
    var self = this;
    var view = this.view;
    var bodyclassList = document.body.classList;
    var currentScrollTop;

    if (num !== '*') {
      var filter = new MozSmsFilter();
      filter.numbers = [num || ''];

      if (this.filter == num)
        currentScrollTop = view.scrollTop;

      this.filter = num;
    } else {
      /* XXX: gaia issue #483 (New Message dialog design)
              gaia issue #108 (contact picker)
      */

      this.num.value = '';
      this.view.innerHTML = '';
      bodyclassList.add('conversation-new-msg');
      bodyclassList.add('conversation');
      return;
    }

    bodyclassList.remove('conversation-new-msg');

    var receiverId = parseInt(num);

    var self = this;
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: num
    };

    this.num.value = num;
    this.title.num = num;
    this.title.textContent = num;

    ContactDataManager.getContactData(options, function getContact(result) {
      var contactImageSrc = 'style/images/contact-placeholder.png';
      if (result && result.length > 0) {
        var contact = result[0];
        self.title.textContent = contact.name[0];
        //TODO: apply the real contact image:
        //contactImageSrc = contact.photo;
      }
      var images = self.view.querySelectorAll('.photo img');
      for (var i = 0; i < images.length; i++)
        images[i].src = contactImageSrc;
    });

    MessageManager.getMessages(function mm_getMessages(messages) {
      /** QUICK and dirty fix for the timestamp issues,
       * it seems that API call does not give the messages ordered
       * so we need to sort the array
       */
      messages.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });

      var lastMessage = messages[messages.length - 1];
      if (pendingMsg &&
          (!lastMessage || lastMessage.id !== pendingMsg.id))
        messages.push(pendingMsg);

      var fragment = '';
      var unreadList = [];

      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        if (!msg.read)
          unreadList.push(msg.id);

        // Add a grouping header if necessary
        var header = ThreadListUI.createNewHeader(msg) || '';
        fragment += header;

        fragment += self.createMessage(msg);
      }

      view.innerHTML = fragment;
      self.scrollViewToBottom(currentScrollTop);

      bodyclassList.add('conversation');

      MessageManager.markMessagesRead(unreadList, true, function markMsg() {
        // TODO : Since spec do not specify the behavior after mark success or
        //        error, we do nothing currently.
      });
    }, filter, true);
  },

  createMessage: function thui_createMessage(message) {
    var dataId = message.id; // uuid
    var outgoing = (message.delivery == 'sent' ||
      message.delivery == 'sending');
    var num = outgoing ? message.sender : message.receiver;
    var dataNum = num;

    var className = (outgoing ? 'sender' : 'receiver') + '"';
    if (message.delivery == 'sending')
      className = 'sender pending"';

    var pic = 'style/images/contact-placeholder.png';

    //Split body in different lines if the sms contains \n
    var msgLines = message.body.split('\n');
    //Apply the escapeHTML body to each line
    msgLines.forEach(function(line, index) {
      msgLines[index] = Utils.escapeHTML(line);
    });
    //Join them back with <br />
    var body = msgLines.join('<br />');
    var timestamp = message.timestamp.getTime();

    return '<div class="message-block" ' + 'data-num="' + dataNum +
           '" data-id="' + dataId + '">' +
           '  <label class="fake-checkbox">' +
           '    <input data-id="' + dataId + '" type="checkbox"/>' +
           '    <span></span>' +
           '  </label>' +
           '  <div class="message-container ' + className + '>' +
           '    <div class="message-bubble"></div>' +
           '    <div class="time" data-time="' + timestamp + '">' +
                  Utils.getHourMinute(message.timestamp) +
           '    </div>' +
           '    <div class="text">' + body + '</div>' +
           '  </div>' +
           '</div>';
  },

  deleteMessage: function thui_deleteMessage(messageId) {
    if (!messageId)
      return;

    MessageManager.deleteMessage(messageId, function(result) {
      if (result) {
        console.log('Message id: ' + messageId + ' deleted');
      } else {
        console.log('Impossible to delete message ID=' + messageId);
      }
    });
  },

  deleteMessages: function thui_deleteMessages() {
    var delList = this.view.querySelectorAll('input[type=checkbox]');
    for (var elem in delList) {
      if (delList[elem].checked) {
        this.deleteMessage(parseFloat(delList[elem].dataset.id));
      }
    }
    this.renderMessages(this.title.num);
    ThreadListUI.renderThreads();
    this.exitEditMode();
  },

  deleteAllMessages: function thui_deleteAllMessages() {
    var inputs = this.view.querySelectorAll('input[type=checkbox]');
    for (var i = 0; i < inputs.length; i++) {
      this.deleteMessage(parseFloat(inputs[i].dataset.id));
    }

    this.hideConfirmationDialog();
    this.renderMessages(this.title.num);
    ThreadListUI.renderThreads();
    this.exitEditMode();
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

  showConfirmationDialog: function thui_showConfirmationDialog() {
    var dialog = document.getElementById('view-confirmation-panel');
    dialog.removeAttribute('hidden');
  },

  hideConfirmationDialog: function thui_hideConfirmationDialog() {
    var dialog = document.getElementById('view-confirmation-panel');
    dialog.setAttribute('hidden', 'true');
  },

  exitEditMode: function thui_exitEditMode() {
    // in case user ticks a message and then Done, we need to empty
    // the deletion list
    this.delNumList = [];

    // Only from a existing message thread window (otherwise, no title.num)
    window.location.hash = '#num=' + this.title.num;
  },

  onListItemClicked: function thui_onListItemClicked(evt) {
    var cb = evt.target.getElementsByClassName('fake-checkbox')[0];
    if (!cb || !document.body.classList.contains('edit-mode')) {
      return;
    }

    evt.preventDefault();
    cb.checked = !cb.checked;
    console.log('ID-' + evt.target.getAttribute('data-id'));
    var id = parseFloat(evt.target.getAttribute('data-id'));
    if (!id) {
      return;
    }
    if (cb.checked) {
      this.delNumList.push(id);
    } else {
      this.delNumList.splice(this.delNumList.indexOf(id), 1);
    }
  },

  close: function thui_close() {
    if (!document.body.classList.contains('conversation') &&
        !window.location.hash)
      return false;

    window.location.hash = '';
    return true;
  },

  sendMessage: function thui_sendMessage() {
    var num = this.num.value;
    var self = this;
    var text = document.getElementById('view-msg-text').value;

    if (num === '' || text === '')
      return;

    MessageManager.send(num, text, function onsent(msg) {
      if (!msg) {
        ThreadUI.input.value = text;
        ThreadUI.updateInputHeight();

        if (ThreadUI.filter) {
          if (window.location.hash !== '#num=' + ThreadUI.filter)
            window.location.hash = '#num=' + ThreadUI.filter;
          else
            ThreadUI.renderMessages(ThreadUI.filter);
        }
        ThreadListUI.renderThreads();

        var resendConfirmStr = _('resendConfirmDialogMsg');
        var result = confirm(resendConfirmStr);
        if (result) {
          window.setTimeout(self.sendMessage.bind(self), 500);
        }
        return;
      }

      // Add a slight delay so that the database has time to write the
      // message in the background. Ideally we'd just be updating the UI
      // from "sending..." to "sent" at this point...
      window.setTimeout(function() {
        if (ThreadUI.filter) {
          if (window.location.hash !== '#num=' + ThreadUI.filter)
            window.location.hash = '#num=' + ThreadUI.filter;
          else
            ThreadUI.renderMessages(ThreadUI.filter);
        }
        ThreadListUI.renderThreads();
      }, 100);
    });

    // Create a preliminary message object and update the view right away.
    var message = {
      sender: null,
      receiver: num,
      delivery: 'sending',
      body: text,
      timestamp: new Date()
    };

    window.setTimeout((function updateMessageField() {
      this.input.value = '';
      this.updateInputHeight();
      this.input.focus();

      if (this.filter) {
        this.renderMessages(this.filter, message);
        return;
      }
      this.renderMessages(num, message);
    }).bind(this), 0);

    ThreadListUI.renderThreads(message);
  },

  pickContact: function thui_pickContact() {
    try {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'webcontacts/contact'
        }
      });
      activity.onsuccess = function() {
        var number = this.result.number;
        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          if (number) {
            var app = evt.target.result;
            app.launch();
            window.location.hash = '#num=' + number;
          }
        };
      }
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
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

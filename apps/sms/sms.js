
// Based on Resig's pretty date
function prettyDate(time) {
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
    return '';

  return day_diff == 0 && (
          diff < 60 && 'just now' ||
          diff < 120 && '1 minute ago' ||
          diff < 3600 && Math.floor(diff / 60) + ' minutes ago' ||
          diff < 7200 && '1 hour ago' ||
          diff < 86400 && Math.floor(diff / 3600) + ' hours ago') ||
          day_diff == 1 && 'Yesterday' ||
          day_diff < 7 && day_diff + ' days ago' ||
          day_diff < 31 && Math.ceil(day_diff / 7) + ' weeks ago';
}


var MessageManager = {
  getMessages: function mm_getMessages(callback, filter, invert) {
    var request = navigator.mozSms.getMessages(filter, !invert);

    var messages = [];
    request.onsuccess = function() {
      var result = request.result;
      if (!result) {
        callback(messages);
        return;
      }

      var message = result.message;
      messages.push(message);
      result.next();
    };

    request.onerror = function() {
      alert('Error reading the database. Error code: ' + request.errorCode);
    }
  },

  send: function mm_send(number, text, callback) {
    var result = navigator.mozSms.send(number, text);
    result.onsuccess = callback;
    result.onerror = callback;
  },

  delete: function mm_delete(id) {
    navigator.mozSms.delete(id);
  }
};

if (!('mozSms' in navigator)) {
  MessageManager.messages = [];

  MessageManager.getMessages =
    function mm_getMessages(callback, filter, invert) {
    function applyFilter(msgs) {
      if (!filter)
        return msgs;

      if (filter.number) {
        msgs = msgs.filter(function(element, index, array) {
            return (filter.number && (filter.number == element.sender ||
                    filter.number == element.receiver));
        });
      }

      return msgs;
    }

    if (this.messages.length) {
      var msg = this.messages.slice();
      if (invert)
        msg.reverse();
      callback(applyFilter(msg));
      return;
    }

    var messages = [
      {
        sender: null,
        receiver: '1-977-743-6797',
        body: 'Nothing :)',
        timestamp: Date.now() - 44000000
      },
      {
        sender: '1-977-743-6797',
        body: 'Hey! What\s up?',
        timestamp: Date.now() - 50000000
      }
    ];

    for (var i = 0; i < 40; i++)
      messages.push({
        sender: '1-488-678-3487',
        body: 'Hello world!',
        timestamp: Date.now() - 60000000
      });

    this.messages = messages;

    var msg = this.messages.slice();
    if (invert)
      msg.reverse();
    callback(applyFilter(msg));
  };

  MessageManager.send = function mm_send(number, text, callback) {
    var message = {
      sender: null,
      receiver: number,
      body: text,
      timestamp: Date.now()
    };
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('smssent', true, false, message);
    setTimeout(function(evt) {
      window.dispatchEvent(event);
      callback();
    }, 1000);
  };

  MessageManager.handleEvent = function handleEvent(evt) {
    this.messages.unshift(evt.detail);
  };

  window.addEventListener('smssent', MessageManager, true);
  window.addEventListener('smsreceived', MessageManager, true);
}


var MessageView = {
  init: function init() {
    window.addEventListener('smsreceived', this, true);
    window.addEventListener('smssent', this, true);

    this.showConversations();
  },

  get conversationView() {
    delete this.conversationView;
    return this.conversationView = document.getElementById('conversation');
  },

  openConversationView: function openConversationView(num) {
    if (!num)
      return;

    ConversationView.showConversation(num == '*' ? '' : num);

    var conversationView = document.getElementById('conversationView');
    conversationView.hidden = false;

    window.setTimeout(function conversationSlideIn() {
      conversationView.classList.remove('slideOut');
      conversationView.classList.add('slideIn');
    }, 100);
  },

  get view() {
    delete this.view;
    return this.view = document.getElementById('messages');
  },

  showConversations: function showConversations() {
    var self = this;
    MessageManager.getMessages(function(messages) {
      var conversations = {};
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        var sender = message.sender || message.receiver;
        if (conversations[sender]) {
          conversations[sender].count++;
          continue;
        }

        conversations[sender] = {
          sender: message.sender,
          receiver: message.receiver,
          body: message.body,
          timestamp: prettyDate(message.timestamp),
          count: 1
        };
      }

      var fragment = '<div class="message" data-num="*">' +
                     '  <div class="title">New Message</div>' +
                     '  <div class="content">Write a message</div>' +
                     '</div>';
      for (var conversation in conversations) {
        var msg = self.createNewMessage(conversations[conversation]);
        fragment += msg;
      }
      self.view.innerHTML = fragment;
    }, null);
  },

  createNewMessage: function createNewMessage(msg) {
    var className = 'class="message ' +
                    (msg.sender ? 'sender' : 'receiver') + '"';

    var num = (msg.sender || msg.receiver);
    var dataNum = 'data-num="' + num + '"';

    var contacts = window.navigator.mozContacts.contacts;
    contacts.forEach(function(contact) {
      if (contact.phones[0] == num)
        num = contact.displayName;
    });
    var title = num + ' (' + msg.count + ')';

    return '<div ' + className + ' ' + dataNum + '>' +
           '  <div class="sms">' +
           '    <div class="title">' + title + '</div>' +
           '    <div class="content">' +
           '      <span class="text">' + msg.body + '</span>' +
           '      <span class="infos">' + msg.timestamp + '</span>' +
           '    </div>' +
           '  </div>' +
           '</div>';
  },

  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'smssent':
      case 'smsreceived':
        // TODO Remove the delay once the native SMS application is disabled
        setTimeout(function(self) {
          self.showConversations();
        }, 800, this);
        break;
    }
  }
};


var ConversationView = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('conversation');
  },

  init: function cv_init() {
    window.addEventListener('keypress', this, true);
    window.addEventListener('smssent', this, true);
    window.addEventListener('smsreceived', this, true);
  },

  showConversation: function cv_showConversation(num) {
    var contact = document.getElementById('contact');
    contact.value = num;

    this.filter = num;
    if (!this.filter) {
      contact.classList.remove('filtered');
      this.view.innerHTML = '';
      return;
    }
    contact.classList.add('filtered');

    var view = this.view;
    var filter = ('SmsFilter' in window) ? new SmsFilter() : {};
    filter.number = this.filter;

    view.innerHTML = '';
    MessageManager.getMessages(function mm_getMessages(messages) {
      var fragment = '';
      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var uuid = msg.hasOwnProperty('uuid') ? msg.uuid : '';
        var dataId = 'data-id="' + uuid + '"';

        var dataNum = 'data-num="' + (msg.sender || msg.receiver) + '"';

        var className = 'class="message ' +
                        (msg.sender ? 'sender' : 'receiver') + '"';

        var time = prettyDate(msg.timestamp);
        fragment += '<div ' + className + ' ' + dataNum + ' ' + dataId + '>' +
                    '  <div class="arrow-left"></div>' +
                    '  <div>' +
                    '    <span class="text">' + msg.body + '</span>' +
                    '    <span class="infos">' + time + '</span>' +
                    '  </div>' +
                    '</div>';
      }

      view.innerHTML = fragment;
      setTimeout(function() {
        view.scrollTop = view.scrollHeight;
      }, 0);
    }, filter, true);
  },

  deleteMessage: function deleteMessage(evt) {
    var uuid = evt.target.getAttribute('data-id');
    if (!uuid)
      return;

    MessageManager.delete(uuid);
    this.showConversation(this.filter);
  },

  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'keypress':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          return;

        if (this.close())
          evt.preventDefault();
      case 'smssent':
      case 'smsreceived':
        // TODO Remove the delay once the native SMS application is disabled
        setTimeout(function(self) {
          self.showConversation(self.filter);
        }, 800, this);
        break;
    }
  },
  close: function cv_close() {
    var view = document.getElementById('conversationView');
    if (view.hidden)
      return false;

    view.classList.remove('slideIn');
    view.classList.add('slideOut');

    view.addEventListener('transitionend', function slideOut(evt) {
      view.removeEventListener('transitionend', slideOut);
      var text = document.getElementById('text');
      text.value = text.style.height = '';

      view.hidden = true;
    });
    return true;
  },
  sendMessage: function cv_sendMessage() {
    var contact = document.getElementById('contact');
    var text = document.getElementById('text');
    if (contact.value == '' || text.value == '')
      return;

    var throbber = document.getElementById('throbber');
    throbber.removeAttribute('hidden');

    MessageManager.send(contact.value, text.value, function() {
      throbber.setAttribute('hidden', 'true');
      text.value = text.style.height = '';

      if (ConversationView.filter)
        return;

      ConversationView.close();
    });
    return;
  }
};

ConversationView.init();

function onKeyPress(evt) {
  var target = evt.originalTarget;
  setTimeout(function() {
    target.style.height = '';
    target.style.height = '-moz-calc(' + target.scrollHeight + 'px + 32px)';
  }, 0);
}


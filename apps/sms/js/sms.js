'use strict';

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
    // XXX Bug 712809
    // Until there is a database for mozSms, use a fake GetMessages
    if (true) {
      GetMessagesHack(callback, filter, invert);
      return;
    }

    var request = navigator.mozSms.getMessages(filter, !invert);

    var messages = [];
    request.onsuccess = function onsuccess() {
      var result = request.result;
      if (!result) {
        callback(messages);
        return;
      }

      var message = result.message;
      messages.push(message);
      result.next();
    };

    request.onerror = function onerror() {
      alert('Error reading the database. Error code: ' + request.errorCode);
    }
  },

  send: function mm_send(number, text, callback) {
    // Use a fake send if mozSms is not present
    if (!navigator.mozSms) {
      var message = {
        sender: null,
        receiver: number,
        body: text,
        timestamp: Date.now()
      };

      window.setTimeout(function() {
        callback(message);
      }, 0);

      return;
    }

    var result = navigator.mozSms.send(number, text);
    result.onsuccess = function onsuccess(event) {
      console.log('SMS sent.');
      callback(event.message);
    };

    result.onerror = function onerror(event) {
      console.log('Error sending SMS!');
      callback(null);
    };
  },

  delete: function mm_delete(id) {
    navigator.mozSms.delete(id);
  }
};

// Until there is a database to store messages on the device, return
// a fake list of messages.
var messagesHack = [];
(function() {
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

  for (var i = 0; i < 40; i++) {
    messages.push({
      sender: '1-488-678-3487',
      body: 'Hello world!',
      timestamp: Date.now() - 60000000
    });
  }

  messagesHack = messages;
})();

var GetMessagesHack = function gmhack(callback, filter, invert) {
  function applyFilter(msgs) {
    if (!filter)
      return msgs;

    if (filter.number) {
      msgs = msgs.filter(function(element, index, array) {
        var num = filter.number;
        return (num && (num == element.sender || num == element.receiver));
      });
    }

    return msgs;
  }

  var msg = messagesHack.slice();
  if (invert)
    msg.reverse();
  callback(applyFilter(msg));
};

var ConversationListView = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('msg-conversations-list');
  },

  get searchInput() {
    delete this.searchInput;
    return this.searchInput = document.getElementById('msg-search');
  },

  init: function init() {
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    window.addEventListener('transitionend', this);
    this.searchInput.addEventListener('keyup', this);
    this.view.addEventListener('click', this);

    this.updateConversationList(function fireAppReady() {
      window.parent.postMessage('appready', '*');
    });
  },

  updateConversationList: function updateConversationList(callback) {
    var self = this;
    MessageManager.getMessages(function getMessagesCallback(messages) {
      var conversations = {};
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        var sender = message.sender || message.receiver;
        if (conversations[sender])
          continue;

        conversations[sender] = {
          sender: message.sender,
          receiver: message.receiver,
          body: message.body,
          timestamp: prettyDate(message.timestamp)
        };
      }

      var fragment = '';
      for (var sender in conversations) {
        var msg = self.createNewConversation(conversations[sender]);
        fragment += msg;
      }
      self.view.innerHTML = fragment;

      if (typeof callback === 'function')
        callback.call(self);
    }, null);
  },

  createNewConversation: function createNewConversation(msg) {
    var num = (msg.sender || msg.receiver);
    var name = num;

    var contacts = window.navigator.mozContacts.contacts;
    contacts.forEach(function(contact) {
      if (contact.phones[0] == num)
        name = contact.displayName;
    });

    return '<div data-num="' + num + '" data-name="' + name + '">' +
           '  <div class="photo">' +
           '    <img alt="" src="" />' +
           '  </div>' +
           '  <div class="name">' + name + '</div>' +
           '  <div class="msg">' + msg.body + '</div>' +
           '  <div class="time">' + msg.timestamp + '</div>' +
           '</div>';
  },

  searchConversations: function searchConversations() {
    var str = this.searchInput.value;
    var conversations = this.view.childNodes;
    if (!str) {
      for (var i in conversations) {
        conversations[i].classList.remove('hide');
      }
      return;
    }

    var reg = new RegExp(str, 'i');

    for (var i in conversations) {
      var conversation = conversations[i];
      if (!reg.test(conversation.dataset.num) &&
          !reg.test(conversation.dataset.name)) {
        conversation.classList.add('hide');
      } else {
        conversation.classList.remove('hide');
      }
    }
  },

  openConversationView: function openConversationView(num) {
    if (!num)
      return;

    ConversationView.showConversation(num == '*' ? '' : num);
  },

  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'received':
        window.setTimeout(function updadeConversationList() {
          ConversationListView.updateConversationList();
        }, 0);
        break;

      case 'click':
        this.openConversationView(evt.target.dataset.num);
        break;

      case 'transitionend':
        if (!document.body.classList.contains('transition-back'))
          return;

        document.body.classList.remove('transition-back');
        break;

      case 'keypress':
      case 'keyup':
        this.searchConversations();
        break;
    }
  }
};

var ConversationView = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('msg-conversation-view-list');
  },

  get num() {
    delete this.number;
    return this.number = document.getElementById('msg-conversation-view-num');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('msg-conversation-view-name');
  },

  init: function cv_init() {
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    document.getElementById('msg-conversation-view-back').addEventListener(
      'click', (this.close).bind(this));

    // click event does not trigger when keyboard is hiding
    document.getElementById('msg-conversation-view-msg-send').addEventListener(
      'mousedown', (this.sendMessage).bind(this));

    var windowEvents = ['keypress', 'transitionend'];
    windowEvents.forEach((function(eventName) {
      window.addEventListener(eventName, this);
    }).bind(this));
  },

  showConversation: function cv_showConversation(num) {
    var view = this.view;
    var bodyclassList = document.body.classList;
    var filter = ('SmsFilter' in window) ? new SmsFilter() : {};
    filter.number = this.filter = num;

    if (!num) {
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

    var name = num;

    var contacts = window.navigator.mozContacts.contacts;
    contacts.forEach(function(contact) {
      if (contact.phones[0] == num)
        name = contact.displayName;
    });

    this.num.value = num;

    this.title.textContent = name;
    this.title.num = num;

    MessageManager.getMessages(function mm_getMessages(messages) {
      var fragment = '';

      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var uuid = msg.hasOwnProperty('uuid') ? msg.uuid : '';
        var dataId = 'data-id="' + uuid + '"';

        var dataNum = 'data-num="' + (msg.sender || msg.receiver) + '"';

        var className = 'class="' +
                        (msg.sender ? 'sender' : 'receiver') + '"';

        var time = prettyDate(msg.timestamp);
        fragment += '<div ' + className + ' ' + dataNum + ' ' + dataId + '>' +
                      '<div class="photo">' +
                        '<img alt="" src="" />' +
                      '</div>' +
                      '<div class="text">' + msg.body + '</div>' +
                      '<div class="time">' + time + '</div>' +
                    '</div>';
      }

      view.innerHTML = fragment;

      if (view.lastChild)
        view.scrollTop = view.lastChild.offsetTop + 10000;

      bodyclassList.add('conversation');
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
        break;

      case 'received':
        var msg = evt.message;
        messagesHack.unshift(msg);

        console.log('Received message from ' + msg.sender + ': ' + msg.body);

        window.setTimeout(function() {
          ConversationView.showConversation(ConversationView.filter);
        }, 0);
        break;

      case 'transitionend':
        if (document.body.classList.contains('conversation'))
          return;

        this.view.innerHTML = '';
        break;
    }
  },
  close: function cv_close() {
    if (!document.body.classList.contains('conversation'))
      return false;
    document.body.classList.remove('conversation');
    document.body.classList.add('transition-back');
    return true;
  },
  sendMessage: function cv_sendMessage() {
    var num = this.num.value;
    var text = document.getElementById('msg-conversation-view-msg-text').value;

    if (num === '' || text === '')
      return;

    MessageManager.send(num, text, function onsent(msg) {
      // There was an error. We should really do some error handling here.
      // or in send() or wherever.
      if (!msg)
        return;

      // Copy all the information from the actual message object to the
      // preliminary message object. Then update the view.
      for (var key in msg)
        message[msg] = msg[key];

      if (ConversationView.filter)
        ConversationView.showConversation(ConversationView.filter);
    });

    // Create a preliminary message object and update the view right away.
    var message = {
      sender: null,
      receiver: num,
      body: text,
      timestamp: Date.now()
    };
    messagesHack.unshift(message);

    setTimeout(function keepKeyboardFocus() {
      var input = document.getElementById('msg-conversation-view-msg-text');
      input.value = '';
    }, 0);

    ConversationListView.updateConversationList();
    if (this.filter) {
      this.showConversation(this.filter);
      return;
    }
    this.showConversation(num);
  }
};

window.addEventListener('load', function loadMessageApp() {
  ConversationView.init();
  ConversationListView.init();
});

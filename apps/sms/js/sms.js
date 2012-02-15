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
    result.onsuccess = function onsuccess(event) {
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
          return (filter.number && (filter.number == element.sender ||
                  filter.number == element.receiver));
      });
    }

    return msgs;
  }

  var msg = messagesHack.slice();
  if (invert)
    msg.reverse();
  callback(applyFilter(msg));
};

// Use a fake send if mozSms is not present
if (!navigator.mozSms) {
  MessageManager.send = function mm_send(number, text, callback) {
    var message = {
      sender: null,
      receiver: number,
      body: text,
      timestamp: Date.now()
    };
    window.setTimeout(function() {
      callback(message);
    }, 0);
  };
}

var MessageView = {
  init: function init() {
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    var conversationViewEvents =
      ['mousedown', 'mouseover', 'mouseup', 'mouseleave'];
    conversationViewEvents.forEach((function(eventName) {
      this.conversationView.addEventListener(eventName, this);
    }).bind(this));

    this.searchInput.addEventListener(
      'keypress', (MessageView.searchMessageView).bind(this));
    this.searchInput.addEventListener(
      'keyup', (MessageView.searchMessageView).bind(this));

    document.getElementById('msg-new-message').addEventListener(
      'click', function newMessage() {
        ConversationView.showConversation();
      });

    window.addEventListener('transitionend', this);

    this.showConversations(
      function appready() {
        window.parent.postMessage('appready', '*');
      }
    );
  },

  get searchInput() {
    delete this.searchInput;
    return this.searchInput = document.getElementById('msg-search');
  },

  get conversationView() {
    delete this.conversationView;
    return this.conversationView = document.getElementById('msg-conversations');
  },

  openConversationView: function openConversationView() {
    var num = this.currentConversation.dataset.num;

    ConversationView.showConversation(num == '*' ? '' : num);
  },

  get view() {
    delete this.view;
    return this.view = document.getElementById('msg-conversation-list');
  },

  showConversations: function showConversations(callback) {
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
            '<div class="photo">' +
              '<img alt="" src="" />' +
            '</div>' +
            '<div class="name">' + name + '</div>' +
            '<div class="msg">' + msg.body + '</div>' +
            '<div class="time">' + msg.timestamp + '</div>' +
           '</div>';
  },

  searchMessageView: function searchMessageView() {
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
      if (!reg.test(conversations[i].dataset.num) &&
          !reg.test(conversations[i].dataset.name)) {
        conversations[i].classList.add('hide');
      } else {
        conversations[i].classList.remove('hide');
      }
    }
  },

  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'received':
        window.setTimeout(function() {
          MessageView.showConversations();
        }, 0);
        break;
      case 'mousedown':
        this.touched = true;
        var selection = this.getSelectionFromEvent(evt);

        if (!selection)
          return;

        selection.classList.add('selected');
        this.currentConversation = selection;

        break;
      case 'mouseover':
        if (!this.touched)
          return;

        var selection = this.getSelectionFromEvent(evt);

        if (this.currentConversation === selection)
          return;

        if (this.currentConversation)
          this.currentConversation.classList.remove('selected');

        if (selection)
          selection.classList.add('selected');

        this.currentConversation = selection;

        break;
      case 'mouseup':
        delete this.touched;

        if (this.currentConversation)
          this.openConversationView();
        break;

      case 'mouseleave':
        if (!this.touched)
          return;
        delete this.touched;

        this.currentConversation.classList.remove('selected');
        delete this.currentConversation;

      case 'transitionend':
        if (!document.body.classList.contains('going-back'))
          return;

        document.body.classList.remove('going-back');
        if (this.currentConversation)
          this.currentConversation.classList.remove('selected');
        delete this.currentConversation;
    }
  },

  getSelectionFromEvent: function getSelectionFromEvent(evt) {
    var target = evt.target;
    while (target !== evt.currentTarget) {
      if (target.dataset.num)
        return target;
      target = target.parentNode;
    }
    return false;
  }
};


var ConversationView = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('msg-conversation-view-msgs');
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

    document.getElementById('msg-conversation-view-msg-send').addEventListener(
      'click', (this.sendMessage).bind(this));

    var windowEvents = ['keypress', 'transitionend'];
    windowEvents.forEach((function(eventName) {
      window.addEventListener(eventName, this);
    }).bind(this));
  },

  showConversation: function cv_showConversation(num) {
    var view = this.view;
    var filter = ('SmsFilter' in window) ? new SmsFilter() : {};
    filter.number = this.filter = num;

    if (!num) {
      /*
        XXX: UX did not define New Message screen.
             let's invent one.
      */
      this.num.value = '';
      this.view.innerHTML = '';
      document.body.classList.add('conversation-new-msg');
      document.body.classList.add('conversation');
      return;
    }

    document.body.classList.remove('conversation-new-msg');

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

      /* XXX: scrollIntoView does not reveal bottom margin */
      if (view.lastChild)
        view.lastChild.scrollIntoView(false);

      document.body.classList.add('conversation');
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
      case 'received':
        var message = evt.message;
        console.log('Received message from ' + message.sender + ': ' +
                    message.body);
        messagesHack.unshift(message);
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
    document.body.classList.add('going-back');
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

    document.getElementById('msg-conversation-view-msg-text').value = '';

    MessageView.showConversations();
    if (this.filter) {
      this.showConversation(this.filter);
      return;
    }
    this.showConversation(num);
  }
};

window.addEventListener('load', (ConversationView.init).bind(ConversationView));
window.addEventListener('load', (MessageView.init).bind(MessageView));


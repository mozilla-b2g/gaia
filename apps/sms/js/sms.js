/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  getMessages: function mm_getMessages(callback, filter, invert) {
    var request = navigator.mozSms.getMessages(filter, !invert);

    var messages = [];
    request.onsuccess = function onsuccess() {
      var cursor = request.result;
      if (!cursor.message) {
        callback(messages);
        return;
      }

      messages.push(cursor.message);
      cursor.continue();
    };

    request.onerror = function onerror() {
      var msg = 'Error reading the database. Error: ' + request.errorCode;
      console.log(msg);
    };
  },

  send: function mm_send(number, text, callback) {
    var result = navigator.mozSms.send(number, text);
    result.onsuccess = function onsuccess(event) {
      callback(event.message);
    };

    result.onerror = function onerror(event) {
      callback(null);
    };
  },

  delete: function mm_delete(id) {
    navigator.mozSms.delete(id);
  }
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

    this.updateConversationList(null, function fireAppReady() {
      var url = document.location.toString();
      visibilityChanged(url);

      window.parent.postMessage('appready', '*');
    });
  },

  updateConversationList: function updateCL(pendingMsg, callback) {
    var self = this;
    var conversations = {};

    // XXX: put all contacts in DOM tree then hide them in non-search view
    var contacts = window.navigator.mozContacts.contacts;
    contacts.forEach(function(contact, i) {
      var num = contact.phones[0];

      conversations[num] = {
        hidden: true,
        name: contact.displayName,
        num: num,
        body: '',
        timestamp: '',
        id: i
      };
    });

    MessageManager.getMessages(function getMessagesCallback(messages) {
      if (pendingMsg)
        messages.push(pendingMsg);

      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        var num = message.sender || message.receiver;
        if (conversations[num] && !conversations[num].hidden)
          continue;
        if (!conversations[num]) {
          conversations[num] = {
            hidden: false,
            num: (message.sender || message.receiver),
            name: num,
            // XXX: hack for contact pic
            id: parseInt(num)
          };
        }

        var data = {
          hidden: false,
          body: message.body,
          timestamp: prettyDate(message.timestamp)
        };

        for (var key in data) {
          conversations[num][key] = data[key];
        }
      }

      var fragment = '';
      for (var num in conversations) {
        var msg = self.createNewConversation(conversations[num]);
        fragment += msg;
      }
      self.view.innerHTML = fragment;

      if (typeof callback === 'function')
        callback.call(self);
    }, null);
  },

  createNewConversation: function createNewConversation(conversation) {

    return '<div data-num="' + conversation.num + '"' +
           ' data-name="' + conversation.name + '"' +
           ' data-notempty="' + (conversation.timestamp ? 'true' : '') + '"' +
           ' class="' + (conversation.hidden ? 'hide' : '') + '">' +
           '  <div class="photo">' +
           '    <img src="' + profilePictureForId(conversation.id) + '" />' +
           '  </div>' +
           '  <div class="name">' + conversation.name + '</div>' +
           '  <div class="msg">' + conversation.body.split('\n')[0] + '</div>' +
           '  <div class="time">' + conversation.timestamp + '</div>' +
           '</div>';
  },

  searchConversations: function searchConversations() {
    var str = this.searchInput.value;
    var conversations = this.view.childNodes;
    if (!str) {
      // leaving search view
      for (var i in conversations) {
        var conversation = conversations[i];
        if (conversation.dataset.notempty === 'true') {
          conversations[i].classList.remove('hide');
        } else {
          conversations[i].classList.add('hide');
        }
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

  init: function cv_init() {
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    document.getElementById('view-back').addEventListener(
      'click', this.close.bind(this));

    // click event does not trigger when keyboard is hiding
    document.getElementById('view-msg-send').addEventListener(
      'mousedown', this.sendMessage.bind(this));

    this.input.addEventListener('input', this.updateInputHeight.bind(this));

    var windowEvents = ['resize', 'keyup', 'transitionend'];
    windowEvents.forEach((function(eventName) {
      window.addEventListener(eventName, this);
    }).bind(this));
  },

  scrollViewToBottom: function cv_scrollViewToBottom() {
    this.view.scrollTop = this.view.scrollHeight;
  },

  updateInputHeight: function cv_updateInputHeight() {
    var input = this.msgInput;
    var currentHeight = input.style.height;
    input.style.height = null;
    var newHeight = input.scrollHeight + 'px';
    this.msgInput.style.height = newHeight;

    if (currentHeight === newHeight)
      return;

    var bottomToolbarHeight = (input.scrollHeight + 32) + 'px';
    var bottomToolbar =
      document.getElementById('view-bottom-toolbar');

    bottomToolbar.style.height = bottomToolbarHeight;

    this.view.style.bottom = bottomToolbarHeight;
    this.scrollViewToBottom();
  },

  showConversation: function cv_showConversation(num, pendingMsg) {
    var self = this;
    var view = this.view;
    var bodyclassList = document.body.classList;

    if (num) {
      var filter = new MozSmsFilter();
      filter.numbers = [num || ''];

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

    var name = num;
    var receiverId = parseInt(num);

    var contacts = window.navigator.mozContacts.contacts;
    contacts.some(function(contact, i) {
      if (contact.phones[0] == num) {
        name = contact.displayName;
        receiverId = i;
        return true;
      }
      return false;
    });

    this.num.value = num;

    this.title.textContent = name;
    this.title.num = num;

    MessageManager.getMessages(function mm_getMessages(messages) {
      if (pendingMsg)
        messages.push(pendingMsg);

      var fragment = '';

      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var uuid = msg.hasOwnProperty('uuid') ? msg.uuid : '';
        var dataId = 'data-id="' + uuid + '"';

        var dataNum = 'data-num="' + (msg.sender || msg.receiver) + '"';

        var className = 'class="' +
                        (msg.sender ? 'sender' : 'receiver') + '"';

        var pic;
        if (msg.sender) {
          pic = profilePictureForId(receiverId);
        } else {
          pic = '../contacts/contact9.png';
        }

        var time = prettyDate(msg.timestamp);
        var body = msg.body.replace(/\n/g, '<br />');
        fragment += '<div ' + className + ' ' + dataNum + ' ' + dataId + '>' +
                      '<div class="photo">' +
                      '  <img src="' + pic + '" />' +
                      '</div>' +
                      '<div class="text">' + body + '</div>' +
                      '<div class="time">' + time + '</div>' +
                    '</div>';
      }

      view.innerHTML = fragment;
      self.scrollViewToBottom();

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
      case 'keyup':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          return;

        if (this.close())
          evt.preventDefault();
        break;

      case 'received':
        var msg = evt.message;
        messagesHack.unshift(msg);

        window.setTimeout(function() {
          ConversationView.showConversation(ConversationView.filter);
        }, 0);
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
  close: function cv_close() {
    if (!document.body.classList.contains('conversation'))
      return false;
    document.body.classList.remove('conversation');
    document.body.classList.add('transition-back');
    return true;
  },
  sendMessage: function cv_sendMessage() {
    var num = this.num.value;
    var text = document.getElementById('view-msg-text').value;

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

      if (ConversationView.filter) {
        // Add a slight delay so that the database has time to write the
        // message in the background. Ideally we'd just be updating the UI
        // from "sending..." to "sent" at this point...
        window.setTimeout(function() {
          ConversationView.showConversation(ConversationView.filter);
        }, 100);
      }
    });

    // Create a preliminary message object and update the view right away.
    var message = {
      sender: null,
      receiver: num,
      body: text,
      timestamp: Date.now()
    };

    setTimeout((function updateMessageField() {
      this.msgInput.value = '';
      this.updateInputHeight();
    }).bind(this), 0);

    ConversationListView.updateConversationList(message);
    if (this.filter) {
      this.showConversation(this.filter, message);
      return;
    }
    this.showConversation(num, message);
  }
};

window.addEventListener('load', function loadMessageApp() {
  var request = navigator.mozSettings.get('language.current');
  request.onsuccess = function() {
    selectedLocale = request.result.value;
    ConversationView.init();
    ConversationListView.init();
  }
});


var selectedLocale = 'en-US';

var kLocaleFormatting = {
  'en-US': 'xxx-xxx-xxxx',
  'fr-FR': 'xx xx xx xx xx',
  'es-ES': 'xx xxx xxxx'
};

function formatNumber(number) {
  var format = kLocaleFormatting[selectedLocale];

  if (number[0] == '+') {
    switch (number[1]) {
      case '1': // North America
        format = 'xx ' + kLocaleFormatting['en-US'];
        break;
      case '2': // Africa
        break;
      case '3': // Europe
        switch (number[2]) {
          case '0': // Greece
            break;
          case '1': // Netherlands
            break;
          case '2': // Belgium
            break;
          case '3': // France
            format = 'xxx ' + kLocaleFormatting['fr-FR'];
            break;
          case '4': // Spain
            format = 'xxx ' + kLocaleFormatting['es-ES'];
            break;
            break;
          case '5':
            break;
          case '6': // Hungary
            break;
          case '7':
            break;
          case '8':
            break;
          case '9': // Italy
            break;
        }
        break;
      case '4': // Europe
        break;
      case '5': // South/Latin America
        break;
      case '6': // South Pacific/Oceania
        break;
      case '7': // Russia and Kazakhstan
        break;
      case '8': // East Asia, Special Services
        break;
      case '9': // West and South Asia, Middle East
        break;
    }
  }

  var formatted = '';

  var index = 0;
  for (var i = 0; i < number.length; i++) {
    var c = format[index++];
    if (c && c != 'x') {
      formatted += c;
      index++;
    }

    formatted += number[i];
  }

  return formatted;
}


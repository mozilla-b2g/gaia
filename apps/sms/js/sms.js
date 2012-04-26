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
    var req = navigator.mozSms.send(number, text);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
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

  init: function cl_init() {
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    this.searchInput.addEventListener('keyup', this);

    window.addEventListener('hashchange', this);

    this.updateConversationList();
  },

  updateConversationList: function cl_updateCL(pendingMsg) {
    var self = this;
    /*
      TODO: Conversation list is always order by contact family names
      not the timestamp.
      It should be timestamp in normal view, and order by name while searching
    */
    MessageManager.getMessages(function getMessagesCallback(messages) {
      if (pendingMsg &&
          (!messages[0] || messages[0].id !== pendingMsg.id))
        messages.unshift(pendingMsg);

      var conversations = {};
      var request = window.navigator.mozContacts.find({});
      request.onsuccess = function findCallback() {
        var contacts = request.result;

        contacts.sort(function contactsSort(a, b) {
          return a.familyName[0].toUpperCase() > b.familyName[0].toUpperCase();
        });

        contacts.forEach(function(contact, i) {
          var num = contact.tel[0];
          conversations[num] = {
            'hidden': true,
            'name': contact.name,
            'num': num,
            'body': '',
            'timestamp': '',
            'id': parseInt(i)
          };
        });

        for (var i = 0; i < messages.length; i++) {
          var message = messages[i];

          // XXX why does this happen?
          if (!message.delivery)
            continue;

          var num = message.delivery == 'received' ?
                    message.sender : message.receiver;

          var conversation = conversations[num];
          if (conversation && !conversation.hidden)
            continue;

          if (!conversation) {
            conversations[num] = {
              'hidden': false,
              'body': message.body,
              'name': num,
              'num': num,
              'timestamp': message.timestamp.getTime(),
              'id': i
            };
          } else {
            conversation.hidden = false;
            conversation.timestamp = message.timestamp.getTime();
            conversation.body = message.body;
          }
        }

        var fragment = '';
        for (var num in conversations) {
          var msg = self.createNewConversation(conversations[num]);
          fragment += msg;
        }
        self.view.innerHTML = fragment;
      };
    }, null);
  },

  createNewConversation: function cl_createNewConversation(conversation) {
    return '<a href="#num=' + conversation.num + '"' +
           ' data-name="' + escapeHTML(conversation.name || conversation.num, true) + '"' +
           ' data-notempty="' + (conversation.timestamp ? 'true' : '') + '"' +
           ' class="' + (conversation.hidden ? 'hide' : '') + '">' +
           '  <div class="photo">' +
           '    <img src="style/images/contact-placeholder.png" />' +
           '  </div>' +
           '  <div class="name">' + escapeHTML(conversation.name) + '</div>' +
           '  <div class="msg">' + escapeHTML(conversation.body.split('\n')[0]) + '</div>' +
           (conversation.timestamp ?
             '  <div class="time" data-time="' + conversation.timestamp + '">' +
                 prettyDate(conversation.timestamp) + '</div>' : '') +
           '</a>';
  },

  searchConversations: function cl_searchConversations() {
    var conversations = this.view.children;

    var str = this.searchInput.value;
    if (!str) {
      // leaving search view
      for (var i = 0; i < conversations.length; i++) {
        var conversation = conversations[i];
        if (conversation.dataset.notempty === 'true') {
          conversation.classList.remove('hide');
        } else {
          conversation.classList.add('hide');
        }
      }
      return;
    }

    var reg = new RegExp(str, 'i');

    for (var i = 0; i < conversations.length; i++) {
      var conversation = conversations[i];
    try {
      var dataset = conversation.dataset;
      if (!reg.test(dataset.num) && !reg.test(dataset.name)) {
        conversation.classList.add('hide');
      } else {
        conversation.classList.remove('hide');
      }
  } catch(e) {
      alert(conversation);
  }
    }
  },

  openConversationView: function cl_openConversationView(num) {
    if (!num)
      return;

    window.location.hash = '#num=' + num;
  },

  handleEvent: function cl_handleEvent(evt) {
    switch (evt.type) {
      case 'received':
        ConversationListView.updateConversationList(evt.message);
        break;

      case 'keyup':
        this.searchConversations();
        break;

      case 'hashchange':
        if (window.location.hash)
          return;
        document.body.classList.remove('conversation');
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

    // click event does not trigger when keyboard is hiding
    document.getElementById('view-msg-send').addEventListener(
      'mousedown', this.sendMessage.bind(this));

    this.input.addEventListener('input', this.updateInputHeight.bind(this));

    var windowEvents = ['resize', 'keyup', 'transitionend', 'hashchange'];
    windowEvents.forEach((function(eventName) {
      window.addEventListener(eventName, this);
    }).bind(this));


    var num = this.getNumFromHash();
    if (num)
      this.showConversation(num);
  },

  getNumFromHash: function cv_getNumFromHash() {
    return (/\bnum=(.+)(&|$)/.exec(window.location.hash) || [])[1];
  },

  scrollViewToBottom: function cv_scrollViewToBottom(animateFromPos) {
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

  updateInputHeight: function cv_updateInputHeight() {
    var input = this.input;
    input.style.height = null;
    input.style.height = input.scrollHeight + 8 + 'px';

    var newHeight = input.getBoundingClientRect().height;
    var bottomToolbarHeight = (newHeight + 32) + 'px';
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
    var options = {filterBy: ['tel'], filterOp: 'contains', filterValue: num};
    var request = window.navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      if (request.result.length == 0)
        return;

      var contact = request.result[0];
      self.title.textContent = contact.name;
      var images = self.view.querySelectorAll('.photo img');
      for (var i = 0; i < images.length; i++)
        images[i].src = 'style/images/contact-placeholder.png';
    };

    this.num.value = num;

    this.title.textContent = num;
    this.title.num = num;

    MessageManager.getMessages(function mm_getMessages(messages) {
      var lastMessage = messages[messages.length - 1];
      if (pendingMsg &&
          (!lastMessage || lastMessage.id !== pendingMsg.id))
        messages.push(pendingMsg);

      var fragment = '';

      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];

        var uuid = msg.hasOwnProperty('uuid') ? msg.uuid : '';
        var dataId = 'data-id="' + uuid + '"';

        var outgoing = (msg.delivery == 'sent' || msg.delivery == 'sending');
        var num = outgoing ? msg.receiver : msg.sender;
        var dataNum = 'data-num="' + num + '"';

        var className = 'class="' + (outgoing ? 'receiver' : 'sender') + '"';
        if (msg.delivery == 'sending')
          className = 'class="receiver pending"';

        var pic = 'style/images/contact-placeholder.png';

        var body = msg.body.replace(/\n/g, '<br />');
        fragment += '<div ' + className + ' ' + dataNum + ' ' + dataId + '>' +
                      '<div class="photo">' +
                      '  <img src="' + pic + '" />' +
                      '</div>' +
                      '<div class="text">' + escapeHTML(body) + '</div>' +
                      '<div class="time" data-time="' + msg.timestamp.getTime() + '">' +
                          prettyDate(msg.timestamp) + '</div>' +
                    '</div>';
      }

      view.innerHTML = fragment;
      self.scrollViewToBottom(currentScrollTop);

      bodyclassList.add('conversation');
    }, filter, true);
  },

  deleteMessage: function cv_deleteMessage(evt) {
    var uuid = evt.target.getAttribute('data-id');
    if (!uuid)
      return;

    MessageManager.delete(uuid);
    this.showConversation(this.filter);
  },

  handleEvent: function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'keyup':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          return;

        if (this.close())
          evt.preventDefault();
        break;

      case 'received':
        var msg = evt.message;

        if (this.filter)
          this.showConversation(ConversationView.filter, msg);
        break;

      case 'transitionend':
        if (document.body.classList.contains('conversation'))
          return;

        this.view.innerHTML = '';
        break;

      case 'hashchange':
        var num = this.getNumFromHash();
        if (!num) {
          this.filter = null;
          return;
        }

        this.showConversation(num);
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

    window.location.hash = '';
    return true;
  },
  sendMessage: function cv_sendMessage() {
    var num = this.num.value;
    var text = document.getElementById('view-msg-text').value;

    if (num === '' || text === '')
      return;

    MessageManager.send(num, text, function onsent(msg) {
      if (!msg) {
        ConversationView.input.value = text;
        ConversationView.updateInputHeight();

        if (ConversationView.filter) {
          if (window.location.hash !== '#num=' + ConversationView.filter)
            window.location.hash = '#num=' + ConversationView.filter;
          else
            ConversationView.showConversation(ConversationView.filter);
        }
        ConversationListView.updateConversationList();
        return;
      }

      // Add a slight delay so that the database has time to write the
      // message in the background. Ideally we'd just be updating the UI
      // from "sending..." to "sent" at this point...
      window.setTimeout(function() {
        if (ConversationView.filter) {
          if (window.location.hash !== '#num=' + ConversationView.filter)
            window.location.hash = '#num=' + ConversationView.filter;
          else
            ConversationView.showConversation(ConversationView.filter);
        }
        ConversationListView.updateConversationList();
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
        this.showConversation(this.filter, message);
        return;
      }
      this.showConversation(num, message);
    }).bind(this), 0);

    ConversationListView.updateConversationList(message);
  }
};

window.addEventListener('localized', function showBody() {
  // get the [lang]-[REGION] setting
  // TODO: expose [REGION] in navigator.mozRegion or document.mozL10n.region?
  if (navigator.mozSettings) {
    var request = navigator.mozSettings.getLock().get('language.current');
    request.onsuccess = function() {
      selectedLocale = request.result['language.current'] || navigator.language;
      ConversationView.init();
      ConversationListView.init();
    }
  }

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  if (document.mozL10n && document.mozL10n.language) {
    var lang = document.mozL10n.language;
    var html = document.querySelector('html');
    html.setAttribute('lang', lang.code);
    html.setAttribute('dir', lang.direction);
  }

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
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


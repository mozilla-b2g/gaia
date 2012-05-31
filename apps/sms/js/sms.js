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

  deleteMessage: function mm_deleteMessage(id, callback) {
    var req = navigator.mozSms.delete(id);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
      var msg = 'Message deleting error in the database. Error: ' + req.errorCode;
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
};

/* DelayDeleteManager and execute the delete task when:
 * 1. A period of time without undo action.
 * 2. View status change.
 * 3. Other scenario...
 * Regist when delete action pending and unregist when delete execute or undo.
*/
var DelayDeleteManager = {
  registDelayDelete: function dm_registDelayDelete(executeDelete) {
    this.executeDelete = executeDelete;
    //TODO: We may have timer to hide the undo toolbar automatically.
    //window.setTimeout(executeMessageDelete, timer);
    document.body.addEventListener('DOMAttrModified', this);
  },
  unregistDelayDelete: function dm_unregistDelayDelete() {
    this.executeDelete = null;
    //window.clearTimeout(executeMessageDelete, timer);
    document.body.removeEventListener('DOMAttrModified', this);
  },
  onViewStatusChanged: function dm_onViewStatusChanged(evt) {
    if (evt.attrName != 'class')
      return;

    // When ConversationListView entering other status.
    if (!evt.prevValue && evt.newValue) {
      this.executeDelete();
    }
  },  
  handleEvent: function dm_handleEvent(evt) {
    switch (evt.type) {
      case 'DOMAttrModified':
        this.onViewStatusChanged(evt);
        break;      
    }
  },
};

/* Contact Manager for maintaining contact cache and access contact DB:
 * 1. Maintain a complete contact in contactData object literal.
 * 2. getAllContactFromCache: get contact data direct from cache.
 * 3. getAllContactFromDB: get contact data asyncronus from message database,
 *      update cache and than execute callback.
 * 4. getContactData: It will have both syncronus and asyncronus callback.
 *      If contact updated, asyncronus run will update cache than execute callback.
*/
var ContactDataManager = {
  init: function cm_init() {
    this.contactData = {};
  },
  getContactData: function cm_getContactData(options ,callback) {
    if (options.filterBy.indexOf('tel')> -1 && options.filterOp == 'contains') {
      var contact = this.contactData[options.filterValue];
      callback(contact ? [contact]: []);
    }
    var self = this;
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      // Update the cache before callback.
      if (options.filterBy.indexOf('tel')> -1 && options.filterOp == 'contains') {
        if (self.contactData[options.filterValue])
          delete self.contactData[options.filterValue];
        if (req.result.length > 0)
          self.contactData[options.filterValue] = req.result[0];
      };
      callback(req.result);    
    };    
    req.onerror = function onerror() {
      var msg = 'Contect finding error. Error: ' + req.errorCode;
      console.log(msg);      
    };    
  },
  getAllContactFromCache: function cm_getAllContactFromCache() {
    return this.contactData;
  },
  getAllContactFromDB: function cm_getAllContactFromDB(callback) {
    var self = this;
    var req = window.navigator.mozContacts.find({});
    
    req.onsuccess = function onsuccess() {
      var contacts = req.result;
      self.contactData = {};

      contacts.sort(function contactsSort(a, b) {
        return a.familyName[0].toUpperCase() > b.familyName[0].toUpperCase();
      });

      contacts.forEach(function(contact, i) {
        var num = contact.tel.length ? contact.tel[0].number : null;
        self.contactData[num] = contact;
      });
      callback(self.contactData);
    }
    
    req.onerror = function onerror() {
      var msg = 'Contect finding error. Error: ' + req.errorCode;
      console.log(msg);      
    };
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
  
  get deleteButton() {
    delete this.deleteButton;
    return this.deleteButton = document.getElementById('msg-delete-button');
  },

  get undoButton() {
    delete this.undoButton;
    return this.undoButton = document.getElementById('msg-undo-button');
  },

  get undoToolbar() {
    delete this.undoToolbar;
    return this.undoToolbar = document.getElementById('msg-undo-toolbar');    
  },

  get undoTitleContainer() {
    delete this.undoTitleContainer;
    return this.undoTitleContainer = document.getElementById('msg-undo-title-container');    
  },

  init: function cl_init() {
    this.delNumList = [];
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    this.searchInput.addEventListener('keyup', this);
    this.searchInput.addEventListener('blur', this);
    this.deleteButton.addEventListener('mousedown', this);
    this.undoButton.addEventListener('mousedown', this);
    this.view.addEventListener('click', this);
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

      // Use the contact cache for applying to the list at first. 
      var allContactData = ContactDataManager.getAllContactFromCache();
      var conversations = {};
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
          if (allContactData[num] && allContactData[num].name[0])
            conversations[num].name = allContactData[num].name[0];
        } else {
          conversation.hidden = false;
          conversation.timestamp = message.timestamp.getTime();
          conversation.body = message.body;
        }
      }

      var fragment = '';
      for (var num in conversations) {
        if (self.delNumList.indexOf(num) > -1) {
          continue;
        }
        var msg = self.createNewConversation(conversations[num]);
        fragment += msg;
      }
      self.view.innerHTML = fragment;

      // Update the contact info after list appended to view.
      ContactDataManager.getAllContactFromDB(function contactCallback(contacts) {
        var conversationList = self.view.children;
        for (var i = 0; i < conversationList.length; i++) {
          var contactData = contacts[conversationList[i].dataset.num];
          var nameElement = conversationList[i].getElementsByClassName('name')[0];
          if (!contactData) {
            // Update list while the contact delected but name exist.
            if (conversationList[i].dataset.name == conversationList[i].dataset.num)
              continue;

            conversationList[i].dataset.name = conversationList[i].dataset.num;
            nameElement.innerHTML = conversationList[i].dataset.num;
          } else {
            // Update list while the contact exist but name does not match.
            var name = escapeHTML(contactData.name);
            if (conversationList[i].dataset.name == name)
              continue;

            conversationList[i].dataset.name = name;
            nameElement.innerHTML = name;    
          }  
        }
      });

      if (self.delNumList.length > 0) {
        self.showUndoToolbar();
      }
    }, null);
  },

  createNewConversation: function cl_createNewConversation(conversation) {
    return '<a href="#num=' + conversation.num + '"' + ' data-num="' + conversation.num + '"' +
           ' data-name="' + escapeHTML(conversation.name || conversation.num, true) + '"' +
           ' data-notempty="' + (conversation.timestamp ? 'true' : '') + '"' +
           ' class="' + (conversation.hidden ? 'hide' : '') + '">' +
           '<input type="checkbox" class="fake-checkbox"/>' + '<span></span>' +
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

      case 'blur':
        window.location.hash = '#';
        break;

      case 'hashchange':
        this.toggleEditMode(window.location.hash == '#edit');
        this.toggleSearchMode(window.location.hash == '#search');
        if (window.location.hash) {
          return;
        }
        document.body.classList.remove('conversation');
        document.body.classList.remove('conversation-new-msg');
        break;

      case 'mousedown':
        if (evt.currentTarget == this.deleteButton)
          this.pendMessageDelete();
        else if (evt.currentTarget == this.undoButton)
          this.undoMessageDelete();
        break;

      case 'click':
        // When Event listening target is this.view and clicked target has href entry.
        if (evt.currentTarget == this.view && evt.target.href)
          this.onListItemClicked(evt);
        break;
    }
  },
  
  /* Message delete scenario:
   *  Delete button will only trigger pendMessageDelete and reflesh conversation list.
   *  When list update, undo toolbar will be triggered when deleted item list exist.
   *  And delayDelete will also regist when undo toolbar show up.
   *  executeMessageDelete would be set for delayDelete regist.
  */
  pendMessageDelete: function cl_pendMessageDelete() {
    if (this.delNumList.length > 0) {
      this.updateConversationList();
    }
    window.location.hash = '#';
  },

  executeMessageDelete: function cl_executeMessageDelete() {
    DelayDeleteManager.unregistDelayDelete();
    this.undoToolbar.classList.remove('show');
    this.deleteMessages(this.delNumList);
    this.delNumList = [];
  },

  undoMessageDelete: function cl_undoMessageDelete() {
    DelayDeleteManager.unregistDelayDelete();
    this.delNumList = [];
    this.updateConversationList();
    this.undoToolbar.classList.remove('show');
  },  

  deleteMessages: function cl_deleteMessages(numberList) {
    if (numberList == [])
      return;
    
    var filter = new MozSmsFilter();
    filter.numbers = numberList;
    
    MessageManager.getMessages(function mm_getMessages(messages) {
      var msgs =[];
      for (var i = 0; i < messages.length; i++) {
        msgs.push(messages[i].id);
      }
      MessageManager.deleteMessages(msgs, this.updateConversationList.bind(this));
    }.bind(this), filter);
  },  

  showUndoToolbar: function cl_showUndoToolbar() {
    var undoTitle = document.mozL10n.get('conversationDeleted');
    this.undoTitleContainer.innerHTML = this.delNumList.length + ' ' + undoTitle;
    this.undoToolbar.classList.add('show');
    DelayDeleteManager.registDelayDelete(this.executeMessageDelete.bind(this));
  },

  toggleSearchMode: function cl_toggleSearchMode(show) {
    if (show) {
      document.body.classList.add('msg-search-mode');
    } else {
      document.body.classList.remove('msg-search-mode');
    }
  },
  
  toggleEditMode: function cl_toggleEditMode(show) {
    if (show) {      
      document.body.classList.add('msg-edit-mode');  
    } else {
      document.body.classList.remove('msg-edit-mode');
    }
  },
  
  onListItemClicked: function cl_onListItemClicked(evt) {
    var cb = evt.target.getElementsByClassName('fake-checkbox')[0];
    if (!cb)
      return;
    
    if (!document.body.classList.contains('msg-edit-mode'))
      return;
    
    evt.preventDefault();
    cb.checked = !cb.checked;
    if (cb.checked) {
      this.delNumList.push(evt.target.dataset.num);
    } else {
      this.delNumList.splice(this.delNumList.indexOf(evt.target.dataset.num), 1);
    }
  },
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
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: num
    };
    ContactDataManager.getContactData(options, function getContact(result) {
      var contactImageSrc = 'style/images/contact-placeholder.png';
      if (result.length == 0) {
        self.title.textContent = num;
      } else {
        var contact = result[0];
        self.title.textContent = contact.name[0];
        //TODO: apply the real contact image:
        //contactImageSrc = contact.photo;
      }
      var images = self.view.querySelectorAll('.photo img');
      for (var i = 0; i < images.length; i++)
        images[i].src = contactImageSrc;      
    });

    this.num.value = num;
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
    if (!document.body.classList.contains('conversation') && !window.location.hash)
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
      ContactDataManager.init();
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


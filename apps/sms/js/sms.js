/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  allMessagesCache: [],

  // Compare the cache and data return from indexedDB to determine
  // whether we need to update the cache and callback with latest messages.
  needUpdateCache: function mm_needUpdateCache(dbData) {
    var cacheData = this.allMessagesCache;
    if (cacheData.length !== dbData.length)
      return true;

    for (var i = 0; i < dbData.length; i++) {
      if (cacheData[i].id !== dbData[i].id)
        return true;

      // Since we could only change read property in message,
      // Add read property checking for cache.
      if (cacheData[i].read !== dbData[i].read)
        return true;

    }
    return false;
  },

  // Cache all messages for improving the conversation lists update.
  // getMessages will return cache data syncronusly and query indexedDB
  // asyncronusly. If message data changed, getMessages will callback again
  // with latest messages.
  getMessages: function mm_getMessages(callback, filter, invert) {
    if (!filter)
      callback(this.allMessagesCache);

    var request = navigator.mozSms.getMessages(filter, !invert);
    var self = this;
    var messages = [];
    request.onsuccess = function onsuccess() {
      var cursor = request.result;
      if (!cursor.message) {
        if (!filter) {
          if (!self.needUpdateCache(messages))
            return;

          self.allMessagesCache = messages;
        }

        callback(messages);
        return;
      }

      messages.push(cursor.message);
      cursor.continue();
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

    // If previous status is not edit mode and class changed, execute delete.
    if (evt.prevValue.indexOf('edit') === -1) {
      this.executeDelete();
    }
  },
  handleEvent: function dm_handleEvent(evt) {
    switch (evt.type) {
      case 'DOMAttrModified':
        this.onViewStatusChanged(evt);
        break;
    }
  }
};

/* Contact Manager for maintaining contact cache and access contact DB:
 * 1. Maintain used contacts in contactData object literal.
 * 2. getContactData: Callback with contact data from 1)cache 2)indexedDB.
 * If cache return "undefined". There will be no callback from cache.
 * Callback will be called twice if cached data turned out to be different than
 * the data from db.
 * Contact return data type:
 *   a) null : Request indexedDB error.
 *   b) Empty array : Request success with no matched result.
 *   c) Array with objects : Request success with matched contacts.
 *
 * XXX Note: We presume that contact.name has only one entry.
*/
var ContactDataManager = {
  contactData: {},
  getContactData: function cm_getContactData(options, callback) {
    var isCacheable = options.filterBy.indexOf('tel') !== -1 &&
                      options.filterOp == 'contains';
    var cacheResult = this.contactData[options.filterValue];
    if (isCacheable && typeof cacheResult !== 'undefined') {
      var cacheArray = cacheResult ? [cacheResult] : [];
      callback(cacheArray);
    }

    var self = this;
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      // Update the cache before callback.
      if (isCacheable) {
        var cacheData = self.contactData[options.filterValue];
        var result = req.result;
        if (result.length > 0) {
          if (cacheData && (cacheData.name[0] == dbData.name[0]))
            return;

          self.contactData[options.filterValue] = result[0];
        } else {
          if (cacheData === null)
            return;

          self.contactData[options.filterValue] = null;
        }
      }
      callback(result);
    };

    req.onerror = function onerror() {
      var msg = 'Contact finding error. Error: ' + req.errorCode;
      console.log(msg);
      callback(null);
    };
  }
};


var ConversationListView = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('msg-conversations-list');
  },

  // get searchToolbar() {
    // delete this.searchToolbar;
    // return this.searchToolbar = document.getElementById('msg-search-container');
  // },
// 
  // get searchInput() {
    // delete this.searchInput;
    // return this.searchInput = document.getElementById('msg-search');
  // },

  get deleteButton() {
    delete this.deleteButton;
    return this.deleteButton = document.getElementById('msg-delete-button');
  },

  get deleteAllButton() {
    delete this.deleteAllButton;
    return this.deleteAllButton = document.getElementById('msg-delete-all-button');

  },

  get cancelDialogButton() {
    delete this.cancelDialogButton;
    return this.cancelDialogButton = document.getElementById('msg-cancel-button');
  },

  get acceptDialogButton() {
    delete this.acceptDialogButton;
    return this.acceptDialogButton = document.getElementById('msg-accept-button');


  },

  init: function cl_init() {
    this.delNumList = [];
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    // this.searchInput.addEventListener('keyup', this);
    // this.searchInput.addEventListener('focus', this);
    // this.searchCancel.addEventListener('mousedown', this);
    this.deleteButton.addEventListener('mousedown', this);
    this.deleteAllButton.addEventListener('mousedown', this);

    this.cancelDialogButton.addEventListener('mousedown', this);
    this.acceptDialogButton.addEventListener('mousedown', this);

    this.view.addEventListener('click', this);
    window.addEventListener('hashchange', this);

    this.updateConversationList();
    document.addEventListener('mozvisibilitychange', this);
  },

  updateMsgWithContact: function cl_updateMsgWithContact(msg) {
    var nameElement = msg.getElementsByClassName('name')[0];
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: msg.dataset.num
    };
    ContactDataManager.getContactData(options, function get(result) {
      // If indexedDB query failed, just leave the previous result.
      if (!result)
        return;

      if (result.length === 0) {
        // Update message while the contact does not exist in DB.
        if (msg.dataset.name == msg.dataset.num)
          return;

        msg.dataset.name = msg.dataset.num;
        nameElement.textContent = msg.dataset.num;
      } else {
        // Update message while the contact exist but name does not match.
        var name = result[0].name[0];
        if (msg.dataset.name == name)
          return;

        msg.dataset.name = name;
        nameElement.textContent = name;
      }
    });
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
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];

        // XXX why does this happen?
        if (!message.delivery)
          continue;

        var num = message.delivery == 'received' ?
                  message.sender : message.receiver;

        var read = message.read;
        var conversation = conversations[num];
        if (conversation && !conversation.hidden) {
          conversation.unreadCount += !read ? 1 : 0;
          continue;
        }

        if (!conversation) {
          conversations[num] = {
            'hidden': false,
            'body': message.body,
            'name': num,
            'num': num,
            'timestamp': message.timestamp.getTime(),
            'unreadCount': !read ? 1 : 0,
            'id': i
          };
        } else {
          conversation.hidden = false;
          conversation.timestamp = message.timestamp.getTime();
          conversation.body = message.body;
        }
      }

     var fragment = '';
      /*
        Order by conversation timestamp not by the contact name.
        We want new conversations in the top.
      */
      var orderedConversations = [];
      for (var num in conversations) {
        /*
          Push an array containing [timestap, conversation]
          so we can order the list by timestap.
        */
        orderedConversations.push([conversations[num].timestamp,
                                  conversations[num]]);
      }
      orderedConversations.sort(function(a,b) {
        return b[0] - a[0];
      });
      //Now we have the ordered conversations
      var conversation;
      for (var i in orderedConversations) {
        conversation = orderedConversations[i][1];
        if (self.delNumList.indexOf(conversation.num) > -1) {
          continue;
        }

        //Add a grouping header if neccessary
        var header = self.createNewHeader(conversation);
        if (header != null) {
          fragment += header;
        }
        fragment += self.createNewConversation(conversation);
      }
      
      self.view.innerHTML = fragment;
      var conversationList = self.view.children;

      // update the conversation sender/receiver name with contact data.
      for (var i = 0; i < conversationList.length; i++) {
        self.updateMsgWithContact(conversationList[i]);
      }

    }, null);
  },

  createHighlightHTML: function cl_createHighlightHTML(text, searchRegExp) {
    var sliceStrs = text.split(searchRegExp);
    var patterns = text.match(searchRegExp);
    var str = '';
    for (var i = 0; i < patterns.length; i++) {
      str = str + escapeHTML(sliceStrs[i]) + '<span class="highlight">' +
                  escapeHTML(patterns[i]) + '</span>';
    }
    str += escapeHTML(sliceStrs.pop());
    return str;
  },

  createNewConversation: function cl_createNewConversation(conversation, reg) {
    var dataName = escapeHTML(conversation.name || conversation.num, true);
    var name = escapeHTML(conversation.name);
    var bodyText = conversation.body.split('\n')[0];
    var bodyHTML = reg ? this.createHighlightHTML(bodyText, reg) :
                           escapeHTML(bodyText);
    var listClass = '';
    if (conversation.hidden) {
      listClass = 'hide';
    } else if (conversation.unreadCount > 0) {
      listClass = 'unread';
    }

    return '<a href="#num=' + conversation.num + '"' +
           ' data-num="' + conversation.num + '"' +
           ' data-name="' + dataName + '"' +
           ' data-notempty="' + (conversation.timestamp ? 'true' : '') + '"' +
           ' class="' + listClass + '">' +
           '<input type="checkbox" class="fake-checkbox"/>' + '<span></span>' +
           '  <div class="name">' + name + '</div>' +
           '  <div class="msg">' + bodyHTML + '</div>' +
           (!conversation.timestamp ? '' :
           '  <div class="time" data-time="' + conversation.timestamp + '">' +
             prettyDate(conversation.timestamp) + '</div>') +
           '<div class="unread-tag">' + conversation.unreadCount + '</div></a>';
  },
  
  //Adds a new grouping header if necesary (today, tomorrow, ...)
  createNewHeader: function cl_createNewHeader(conversation) {
    function sameDay(ts1, ts2) {
      var d1, d2;
      d1 = new Date(ts1);
      d2 = new Date(ts2);

      return d1.getFullYear() == d2.getFullYear() &&
        d1.getMonth() == d2.getMonth() &&
        d1.getDate() == d2.getDate();
    };

    if (this._lastHeader && sameDay(this._lastHeader, conversation.timestamp)) {
      return null;
    }

    this._lastHeader = conversation.timestamp;

    var now = new Date();
    //Build the today date starting a 00:00:00
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = today.getTime() - conversation.timestamp;
    var aDay = 1000 * 60 * 60 * 24; //Miliseconds for a day

    var content;
    if (diff <= 0) {
      //Show today
      content = 'TODAY'; //TODO: Localise
    } else if (diff > 0 && diff < aDay * 2) {
      //Show yesterday
      content = 'YESTERDAY'; //TODO: Localise
    } else if (diff < 4 * aDay) {
      //Show the day of the week
      var d = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'];
      //TODO: Localise
      content = d[new Date(conversation.timestamp).getDay()];
    } else {
      //Show the date
      var d = new Date(conversation.timestamp);
      //TODO: Localise
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    return '<div class="groupHeader">' + content + '</div>';

  },

/*** No search functions on new UX ***/
  // searchConversations: function cl_searchConversations() {
    // var str = this.searchInput.value;
    // if (!str) {
      // // Leave the empty view when no text in the input.
      // this.view.innerHTML = '';
      // return;
    // }
// 
    // var self = this;
    // MessageManager.getMessages(function getMessagesCallback(messages) {
      // str = str.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&');
      // var fragment = '';
      // var searchedNum = {};
      // for (var i = 0; i < messages.length; i++) {
        // var reg = new RegExp(str, 'ig');
        // var message = messages[i];
        // var htmlContent = message.body.split('\n')[0];
        // var num = message.delivery == 'received' ?
                  // message.sender : message.receiver;
        // var read = message.read;
// 
        // if (searchedNum[num])
          // searchedNum[num].unreadCount += !message.read ? 1 : 0;
// 
        // if (!reg.test(htmlContent) || searchedNum[num] ||
            // self.delNumList.indexOf(num) !== -1)
          // continue;
// 
        // var msgProperties = {
          // 'hidden': false,
          // 'body': message.body,
          // 'name': num,
          // 'num': num,
          // 'timestamp': message.timestamp.getTime(),
          // 'unreadCount': !read ? 1 : 0,
          // 'id': i
        // };
        // searchedNum[num] = msgProperties;
        // var msg = self.createNewConversation(msgProperties, reg);
        // fragment += msg;
// 
      // }
// 
      // self.view.innerHTML = fragment;
// 
      // // update the conversation sender/receiver name with contact data.
      // var conversationList = self.view.children;
      // for (var i = 0; i < conversationList.length; i++) {
        // self.updateMsgWithContact(conversationList[i]);
      // }
    // }, null);
  // },

  openConversationView: function cl_openConversationView(num) {
    if (!num)
      return;

    window.location.hash = '#num=' + num;
  },

  // Update the body class depends on the current hash and original class list.
  pageStatusController: function cl_pageStatusController() {
    var bodyclassList = document.body.classList;
    switch (window.location.hash) {
      case '':
        bodyclassList.remove('edit-mode');
        if (!bodyclassList.contains('msg-search-result-mode') &&
            !bodyclassList.contains('conversation'))
          return;

        // this.searchInput.value = '';
        this.updateConversationList();
        bodyclassList.remove('conversation');
        bodyclassList.remove('conversation-new-msg');
        break;
      case '#edit':  // Edit mode with all conversations.
        bodyclassList.add('edit-mode');
        bodyclassList.remove('msg-search-mode');
        break;
      // no search function in new UX
      // case '#search': // Display search toolbar with all conversations.
        // bodyclassList.remove('msg-edit-mode');
        // bodyclassList.add('msg-search-mode');
        // break;
      // case '#searchresult': // Display searched conversations.
        // bodyclassList.remove('msg-search-mode');
        // bodyclassList.remove('msg-edit-mode');
        // bodyclassList.add('msg-search-result-mode');
        // if (!this.searchInput.value)
          // this.view.innerHTML = '';
        // break;
      // case '#searchresult_edit':  // Edit mode with the searched conversations.
        // bodyclassList.add('msg-edit-mode');
        // bodyclassList.add('msg-search-result-mode');
        // break;
    }
  },

  handleEvent: function cl_handleEvent(evt) {
    switch (evt.type) {
      case 'received':
        ConversationListView.updateConversationList(evt.message);
        break;

      case 'keyup':
        // this.searchConversations();
        break;

      case 'focus':
        // window.location.hash = '#searchresult';
        break;

      case 'hashchange':
        this.pageStatusController();
        break;

      case 'mousedown':
        switch (evt.currentTarget) {
          case this.deleteButton:
            this.executeMessageDelete();
            break;
          case this.deleteAllButton:
            this.showConfirmationDialog();
            break;
          case this.acceptDialogButton:
            this.executeAllMessagesDelete();
            break;
          case this.cancelDialogButton:
            this.hideConfirmationDialog();
            break;
        }
        break;

      case 'click':
        // When Event listening target is this.view and clicked target
        // has href entry.
        if (evt.currentTarget == this.view && evt.target.href) {
          this.onListItemClicked(evt);
        }
        break;

      case 'mozvisibilitychange':
        if (document.mozHidden)
          return;

        // Refresh the view when app return to foreground.
        this.updateConversationList();
        break;
    }
  },

  executeMessageDelete: function cl_executeMessageDelete() {
    this.deleteMessages(this.delNumList);
    this.delNumList = [];
  },

  executeAllMessagesDelete: function cl_executeAllMessagesDelete() {
    // Clean current list in case messages checked
    this.delNumList = [];

    var inputElements_list = document.getElementById('msg-conversations-list').getElementsByTagName('a');
    for (var i = 0; i < inputElements_list.length; i++) {
      this.delNumList.push(inputElements_list[i].dataset.num);
    }

    this.executeMessageDelete();
    this.hideConfirmationDialog();
  },

  showConfirmationDialog: function cl_showConfirmationDialog() {
    var bodyclassList = document.body.classList;
    bodyclassList.add('msg-confirmation-pending');
  },

  hideConfirmationDialog: function cl_hideConfirmationDialog() {
    var bodyclassList = document.body.classList;
    bodyclassList.remove('msg-confirmation-pending');
  },

  deleteMessages: function cl_deleteMessages(numberList) {
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
      MessageManager.deleteMessages(msgs, this.updateConversationList.bind(this));
    }.bind(this), filter);

    window.location.hash = '#';
  },

/** No search function on new UX **/
  // toggleSearchMode: function cl_toggleSearchMode(show) {
    // if (show) {
      // document.body.classList.add('msg-search-mode');
    // } else {
      // document.body.classList.remove('msg-search-mode');
    // }
  // },

  toggleEditMode: function cl_toggleEditMode(show) {
    if (show) {      
      document.body.classList.add('edit-mode');  
    } else {
      document.body.classList.remove('edit-mode');
    }
  },

  onListItemClicked: function cl_onListItemClicked(evt) {
    var cb = evt.target.getElementsByClassName('fake-checkbox')[0];
    if (!cb){
      return;
    }

    if (!document.body.classList.contains('edit-mode')){
      return;
    }

    evt.preventDefault();
    cb.checked = !cb.checked;
    if (cb.checked) {
      this.delNumList.push(evt.target.dataset.num);
    } else {
      this.delNumList.splice(this.delNumList.indexOf(evt.target.dataset.num), 1);
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
  
  get doneButton() {
      delete this.doneButton;
      return this.doneButton = document.getElementById('view-done-button');
  },

  get deleteButton() {
    delete this.deleteButton;
    return this.deleteButton = document.getElementById('view-delete-button');
  },

  get deleteAllButton() {
    delete this.deleteAllButton;
    return this.deleteAllButton = document.getElementById('view-delete-all-button');

  },

  get cancelDialogButton() {
    delete this.cancelDialogButton;
    return this.cancelDialogButton = document.getElementById('view-cancel-button');
  },

  get acceptDialogButton() {
    delete this.acceptDialogButton;
    return this.acceptDialogButton = document.getElementById('view-accept-button');
  },
  
  get sendButton() {
      delete this.sendButton;
      return this.sendButton = document.getElementById('view-msg-send');
  },

  init: function cv_init() {
    this.delNumList = [];
    
    if (navigator.mozSms)
      navigator.mozSms.addEventListener('received', this);

    // click event does not trigger when keyboard is hiding
    this.sendButton.addEventListener('mousedown', this.sendMessage.bind(this));
      
    this.doneButton.addEventListener('mousedown', this);
    this.deleteButton.addEventListener('mousedown', this);
    this.deleteAllButton.addEventListener('mousedown', this);
    this.acceptDialogButton.addEventListener('mousedown', this);
    this.cancelDialogButton.addEventListener('mousedown', this);

    this.input.addEventListener('input', this.updateInputHeight.bind(this));
    this.view.addEventListener('click', this);
 
    var windowEvents = ['resize', 'keyup', 'transitionend', 'hashchange'];
    windowEvents.forEach((function(eventName) {
      window.addEventListener(eventName, this);
    }).bind(this));


    var num = this.getNumFromHash();
    if (num)
      this.showConversation(num);

    document.addEventListener('mozvisibilitychange', this);
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

        //var uuid = msg.hasOwnProperty('uuid') ? msg.uuid : '';
        var dataId = msg.id; // uuid

        var outgoing = (msg.delivery == 'sent' || msg.delivery == 'sending');
        var num = outgoing ? msg.receiver : msg.sender;
        var dataNum = num;

        var className = (outgoing ? 'receiver' : 'sender') + '"';
        if (msg.delivery == 'sending')
          className = 'receiver pending"';

        var pic = 'style/images/contact-placeholder.png';

        var body = msg.body.replace(/\n/g, '<br />');

        fragment += '<div class="message-block" ' + 'data-num="' + dataNum + '" data-id="' + dataId + '">' +
                      '<input type="checkbox" class="fake-checkbox"/>' + '<span></span>' +
                      '<div class="message-container ' + className + '>' +
                        '<div class="text">' + escapeHTML(body) + '</div>' +
                        '<div class="time" data-time="' + msg.timestamp.getTime() + '">' +
                            prettyDate(msg.timestamp) + '</div>' +
                      '</div>' + 
                     '</div>';
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

  deleteMessage: function cv_deleteMessage(messageId) {
    if (!messageId) 
      return;
    
    MessageManager.deleteMessage(messageId,function(result){
        if (result) {
          console.log("Message id: "+messageId+" deleted");
        } else {
          console.log("Impossible to delete message ID="+messageId);
        }
      });
  },

  deleteMessages: function cv_deleteMessages() {
    if (!this.delNumList || this.delNumList.length == 0)
      return;
    for (var i=0; i < this.delNumList.length; i++) {
      this.deleteMessage(this.delNumList[i]);//TODO shift[i]);
    };
    this.delNumList = [];
    this.showConversation(this.title.num);
    ConversationListView.updateConversationList();
    this.exitEditMode();
  },
  
  deleteAllMessages: function cv_deleteMessages() {
    // Clean current list in case messages checked
    this.delNumList = [];

    var inputElements_list = document.getElementById('view-list').getElementsByClassName('message-block');
    for (var i = 0; i < inputElements_list.length; i++) {
      this.delNumList.push(parseFloat(inputElements_list[i].dataset.id));
    }

    this.deleteMessages();
    this.hideConfirmationDialog();
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
        this.toggleEditMode(window.location.hash == '#edit');
        
        var num = this.getNumFromHash();
        if (!num) {
          this.filter = null;
          return;
        }

        this.showConversation(num);
        break;
        /**/
       // document.body.classList.remove('conversation');
       // document.body.classList.remove('conversation-new-msg');
        /**/
       
      case 'resize':
        if (!document.body.classList.contains('conversation'))
          return;

        this.updateInputHeight();
        this.scrollViewToBottom();
        break;

      case 'mozvisibilitychange':
        if (document.mozHidden)
          return;

        // Refresh the view when app return to foreground.
        var num = this.getNumFromHash();
        if (num) {
          this.showConversation(num);
      }
      break;
        
      case 'click':
        // When Event listening target is this.view and clicked target is a message.
        if (evt.currentTarget == this.view && ~evt.target.className.indexOf('message')) {
          this.onListItemClicked(evt);
        }
        break;
        
       case 'mousedown':
        switch (evt.currentTarget) {
          case this.doneButton:
            this.exitEditMode();
            break;
          case this.deleteButton:
            this.deleteMessages();
            break;
          case this.deleteAllButton:
            this.showConfirmationDialog();
            break;
          case this.acceptDialogButton:
            this.deleteAllMessages();
            break;
          case this.cancelDialogButton:
            this.hideConfirmationDialog();
            break;
        }
        break;
    }
  },
  
  showConfirmationDialog: function cv_showConfirmationDialog() {
    var bodyclassList = document.body.classList;
    bodyclassList.add('view-confirmation-pending');
  },

  hideConfirmationDialog: function cv_hideConfirmationDialog() {
    var bodyclassList = document.body.classList;
    bodyclassList.remove('view-confirmation-pending');
  },

  exitEditMode: function cv_exitEditMode(){
    // in case user ticks a message and then Done, we need to empty the deletion list
    this.delNumList = [];
    
    // Only from a existing message thread window (otherwise, no title.num)
    window.location.hash = "#num="+this.title.num;
  },
  
  toggleEditMode: function cv_toggleEditMode(show) {
    if (show) {      
      document.body.classList.add('edit-mode');  
    } else {
      document.body.classList.remove('edit-mode');
    }
  },
  
  onListItemClicked: function cv_onListItemClicked(evt) {
    var cb = evt.target.getElementsByClassName('fake-checkbox')[0];
    if (!cb){
      return;
    }
    if (!document.body.classList.contains('edit-mode')){
      return;
    }
    
    evt.preventDefault();
    cb.checked = !cb.checked;
    console.log("ID-"+evt.target.getAttribute('data-id'));
    var id = parseFloat(evt.target.getAttribute('data-id'));
    if (!id){
      return;
    }
    if (cb.checked) {
      this.delNumList.push(id);
    } else {
      this.delNumList.splice(this.delNumList.indexOf(id), 1);
    }
  },
  
  close: function cv_close() {
    if (!document.body.classList.contains('conversation') &&
        !window.location.hash)
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


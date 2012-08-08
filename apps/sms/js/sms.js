/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  init: function mm_init() {
    // Init Pending DB. Once it will be loaded will render threads
    PendingMsgManager.init(function() {
      MessageManager.getMessages(ThreadListUI.renderThreads);
    });
    // Init UI Managers
    ThreadUI.init();
    ThreadListUI.init();
    // Init first time
    this.getMessages(ThreadListUI.renderThreads);

    if (navigator.mozSms) {
      navigator.mozSms.addEventListener('received', this);
    }
    window.addEventListener('hashchange', this);
    document.addEventListener('mozvisibilitychange', this);
  },
  slide: function mm_slide(callback) {
    var bodyClass = document.body.classList;
    var mainWrapper = document.getElementById('main-wrapper');
    var messagesMirror = document.getElementById('thread-messages-snapshot');
    bodyClass.add('snapshot');
    bodyClass.toggle('mirror-swipe');
    mainWrapper.classList.toggle('to-left');
    messagesMirror.addEventListener('transitionend', function rm_snapshot() {
      messagesMirror.removeEventListener('transitionend', rm_snapshot);
      bodyClass.remove('snapshot');
      if (callback) {
        callback();
      }
    });
  },
  handleEvent: function mm_handleEvent(event) {
    switch (event.type) {
      case 'received':
        var num = this.getNumFromHash();
        var sender = event.message.sender;
        if (num == sender) {
          //Append message and mark as unread
          MessageManager.markMessageRead(event.message.id, true, function() {
            MessageManager.getMessages(ThreadListUI.renderThreads);
          });
          ThreadUI.appendMessage(event.message, function() {
              Utils.updateHeaders();
            });
        } else {
          MessageManager.getMessages(ThreadListUI.renderThreads);
        }
        break;
      case 'hashchange':
        var bodyclassList = document.body.classList;
        var mainWrapper = document.getElementById('main-wrapper');
        var threadMessages = document.getElementById('thread-messages');
        switch (window.location.hash) {
          case '#new':
            document.getElementById('messages-container').innerHTML = '';
            document.getElementById('message-to-send').innerHTML = '';
            document.getElementById('receiver-input').value = '';
            threadMessages.classList.add('new');
            MessageManager.slide();
            break;
          case '#thread-list':
            if (mainWrapper.classList.contains('edit')) {
              mainWrapper.classList.remove('edit');
            } else if (threadMessages.classList.contains('new')) {
              MessageManager.slide(function() {
                threadMessages.classList.remove('new');
              });
            } else {
              MessageManager.slide();
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
              MessageManager.currentNum = num;
              if (mainWrapper.classList.contains('edit')) {
                mainWrapper.classList.remove('edit');
              } else if (threadMessages.classList.contains('new')) {
                var filter = this.createFilter(num);
                this.getMessages(ThreadUI.renderMessages, filter);
                threadMessages.classList.remove('new');
              } else {
                var filter = this.createFilter(num);
                this.getMessages(ThreadUI.renderMessages,
                  filter, null, MessageManager.slide);
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
  getMessages: function mm_getMessages(callback, filter, invert, callbackArgs) {
    var request = navigator.mozSms.getMessages(filter, !invert);
    var self = this;
    var messages = [];
    request.onsuccess = function onsuccess() {
      var cursor = request.result;
      if (cursor.message) {
        messages.push(cursor.message);
        cursor.continue();
      } else {
        if (!PendingMsgManager.dbReady) {
          callback(messages, callbackArgs);
          return;
        }
        var filterNum = filter ? filter.numbers[0] : null;
        //TODO: Refine the pending message append with non-blocking method.
        PendingMsgManager.getMsgDB(filterNum, function msgCb(pendingMsgs) {
          if (!pendingMsgs) {
            return;
          }
          messages = messages.concat(pendingMsgs);
          messages.sort(function(a, b) {
              return filterNum ? a.timestamp - b.timestamp :
                                b.timestamp - a.timestamp;
          });
          callback(messages, callbackArgs);
        });
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

  markMessageRead: function mm_markMessageRead(id, value, callback) {
    if (navigator.mozSms) {
      var req = navigator.mozSms.markMessageRead(id, value);
      req.onsuccess = function onsuccess() {
        callback(req.result);
      };

      req.onerror = function onerror() {
        var msg = 'Mark message error in the database. Error: ' + req.errorCode;
        console.log(msg);
        callback(null);
      };
    }
  },

  markMessagesRead: function mm_markMessagesRead(list, value, callback) {
    // TODO Will be fixed in https://bugzilla.mozilla.org/show_bug.cgi?id=771463
    for (var i = 0; i < list.length; i++) {
      if (i == list.length - 1) {
        MessageManager.markMessageRead(list[i], value, callback);
      } else {
        MessageManager.markMessageRead(list[i], value);
      }
    }
  }
};

var ThreadListUI = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('thread-list-container');
  },
  get deleteAllButton() {
    delete this.deleteAllButton;
    return this.deleteAllButton =
    document.getElementById('delete-all-threads');
  },
  get deleteSelectedButton() {
    delete this.deleteSelectedButton;
    return this.deleteSelectedButton =
    document.getElementById('delete-selected-threads');
  },
  get doneButton() {
    delete this.doneButton;
    return this.doneButton = document.getElementById('thread-done-button');
  },
  get iconEdit() {
    delete this.iconEdit;
    return this.iconEdit = document.getElementById('icon-edit-threads');
  },
  get editHeader() {
    delete this.editHeader;
    return this.editHeader = document.getElementById('list-edit-title');
  },

  init: function thlui_init() {
    this.delNumList = [];
    this.pendingDelList = [];
    this.selectedInputList = [];
    this.deleteAllButton.addEventListener('click',
      this.deleteAllThreads.bind(this));
    this.deleteSelectedButton.addEventListener('click',
      this.deleteThreads.bind(this));
    this.doneButton.addEventListener('click', this.executeDeletion.bind(this));
    this.view.addEventListener('click', this);
   },

  updateMsgWithContact: function thlui_updateMsgWithContact(number, contact) {
    var element =
      this.view.querySelector('a[data-num="' + number + '"] div.name');
    if (element) {
      element.innerHTML = contact[0].name || _('unknown-contact');
    }
  },

  handleEvent: function thlui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (evt.target.type == 'checkbox') {
          if (evt.target.checked) {
            ThreadListUI.selectedInputList.push(evt.target);
          } else {
            ThreadListUI.selectedInputList.splice(
                      ThreadListUI.selectedInputList.indexOf(evt.target), 1);
          }
          var selected = ThreadListUI.selectedInputList.length;
          if (selected > 0) {
            ThreadListUI.deleteSelectedButton.classList.remove('disabled');
            this.editHeader.innerHTML = selected + ' Selected';

          } else {
            ThreadListUI.deleteSelectedButton.classList.add('disabled');
            this.editHeader.innerHTML = 'Edit mode';
          }
        }
        break;
    }
  },

  cleanForm: function thlui_cleanForm() {
    var inputs = this.view.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    this.delNumList = [];
    this.selectedInputList = [];
    this.editHeader.innerHTML = 'Edit mode';
    this.deleteSelectedButton.classList.add('disabled');
  },

  deleteAllThreads: function thlui_deleteAllThreads() {
    var response = window.confirm(_('deleteAll-confirmation'));
    if (response) {
      this.delNumList = [];
      this.pendingDelList = [];
      var inputs = this.view.querySelectorAll('input[type="checkbox"]');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].parentNode.parentNode.classList.add('undo-candidate');
      }
      // We get ALL the messages
      MessageManager.getMessages(function deleteAll(messages) {
        for (var i = 0; i < messages.length; i++) {
          if (messages[i].delivery == 'sent' ||
           messages[i].delivery == 'received') {
            ThreadListUI.delNumList.push(messages[i].id);
          } else { //pending
            ThreadListUI.pendingDelList.push(messages[i]);
          }
        }
        ThreadListUI.executeDeletion();
      });
    }
  },

  deleteThreads: function thlui_deleteThreads() {
    this.delNumList = []; //clean the lists before adding stuff
    this.pendingDelList = [];
    var inputs = ThreadListUI.selectedInputList;
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].parentNode.parentNode.classList.add('undo-candidate');
      var filter = MessageManager.createFilter(inputs[i].value);
      MessageManager.getMessages(function gotMessages(messages) {
        for (var j = 0; j < messages.length; j++) {
          if (messages[j].delivery == 'sent' ||
              messages[j].delivery == 'received') {
            ThreadListUI.delNumList.push(parseFloat(messages[j].id));
          } else {
            ThreadListUI.pendingDelList.push(messages[j]);
          }
        }
      }, filter);
    }
    // Cleaning
    ThreadListUI.selectedInputList = [];
    this.editHeader.innerHTML = _('editMode');
    this.deleteSelectedButton.classList.add('disabled');
  },

  executeDeletion: function thlui_executeDeletion() {
    WaitingScreen.show();
    MessageManager.deleteMessages(ThreadListUI.delNumList, function repaint() {
      //TODO Change this functionality with Steve code
      //TODO Steve will add delete pending in deleteMessages!
      if (ThreadListUI.pendingDelList.length > 0) {
        for (var i = 0; i < ThreadListUI.pendingDelList.length; i++) {
          if (i == ThreadListUI.pendingDelList.length - 1) {
            PendingMsgManager.deleteFromMsgDB(ThreadListUI.pendingDelList[i],
              function() {
              MessageManager.getMessages(function recoverMessages(messages) {
                ThreadListUI.renderThreads(messages);
                WaitingScreen.hide();
                window.location.hash = '#thread-list';
              });
            });
          } else {
            PendingMsgManager.deleteFromMsgDB(ThreadListUI.pendingDelList[i]);
          }
        }
      } else {
        MessageManager.getMessages(function recoverMessages(messages) {
          ThreadListUI.renderThreads(messages);
          WaitingScreen.hide();
          window.location.hash = '#thread-list';
        });
      }
    });
  },

  renderThreads: function thlui_renderThreads(messages, callback) {
    ThreadListUI.view.innerHTML = '';
    if (messages.length > 0) {
      ThreadListUI.iconEdit.classList.remove('disabled');
      var threadIds = [], headerIndex, unreadThreads = [];
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        var num = message.delivery == 'received' ?
        message.sender : message.receiver;
        if (!message.read) {
          if (unreadThreads.indexOf(num) == -1) {
            unreadThreads.push(num);
          }
        }
        if (threadIds.indexOf(num) == -1) {
          var thread = {
            'body': message.body,
            'name': num,
            'num': num,
            'timestamp': message.timestamp.getTime(),
            'unreadCount': !message.read ? 1 : 0,
            'id': num
          };
          if (threadIds.length == 0) {
            var currentTS = (new Date()).getTime();
            headerIndex = Utils.getDayDate(currentTS);
            ThreadListUI.createNewHeader(currentTS);
          }else {
            var tmpIndex = Utils.getDayDate(message.timestamp.getTime());
            if (tmpIndex < headerIndex) {
              ThreadListUI.createNewHeader(message.timestamp.getTime());
              headerIndex = tmpIndex;
            }
          }
          threadIds.push(num);
          ThreadListUI.appendThread(thread);
        }
      }
      // Update threads with 'unread'
      for (var i = 0; i < unreadThreads.length; i++) {
        document.getElementById(unreadThreads[i]).classList.add('unread');
      }
      // Boot update of headers
      Utils.updateHeaderScheduler();

    } else {
      var noResultHTML = '<div id="no-result-container">' +
            ' <div id="no-result-message">' +
            '   <p data-l10n-id="noMessage-title">no messages recorded</p>' +
            '   <p data-l10n-id="noMessage-text">start communicating now</p>' +
            ' </div>' +
            '</div>';
      ThreadListUI.view.innerHTML = noResultHTML;
      ThreadListUI.iconEdit.classList.add('disabled');
    }
    // Callback when every message is appended
    if (callback) {
      callback();
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
    var structureHTML = '  <a id="' + thread.num +
            '" href="#num=' + thread.num + '"' +
            '     data-num="' + thread.num + '"' +
            '     data-name="' + dataName + '"' +
            '     data-notempty="' +
                  (thread.timestamp ? 'true' : '') + '">' +
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
            '    <div class="photo">' +
            '    <img src="">' +
            '    </div>' +
            '  </a>' +
            '  <div class="checkbox-container">' +
            '   <input type="checkbox" value="' + thread.num + '">' +
            '   <span></span>' +
            '  </div>';
    // Update HTML and append
    threadHTML.innerHTML = structureHTML;
    this.view.appendChild(threadHTML);

    // Get the contact data for the number
    ContactDataManager.getContactData(thread.num, function gotContact(contact) {
      if (contact && contact.length > 0)
        ThreadListUI.updateMsgWithContact(thread.num, contact);
    });
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createNewHeader: function thlui_createNewHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('h2');
    // Append 'time-update' state
    headerHTML.setAttribute('data-time-update', true);
    headerHTML.setAttribute('data-time', timestamp);
    // Add text
    headerHTML.innerHTML = Utils.getHeaderDate(timestamp);
    //Add to DOM
    ThreadListUI.view.appendChild(headerHTML);
  }
};

var ThreadUI = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('messages-container');
  },

  get contactInput() {
    delete this.contactInput;
    return this.contactInput = document.getElementById('receiver-input');
  },

  get clearButton() {
    delete this.clearButton;
    return this.clearButton = document.getElementById('clear-search');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('header-text');
  },

  get input() {
    delete this.input;
    return this.input = document.getElementById('message-to-send');
  },

  get sendButton() {
    delete this.sendButton;
    return this.sendButton = document.getElementById('send-message');
  },

  get pickButton() {
    delete this.pickButton;
    return this.pickButton = document.getElementById('icon-contact');
  },

  get deleteAllButton() {
    delete this.deleteAllButton;
    return this.deleteAllButton =
    document.getElementById('delete-all-messages');
  },

  get deleteSelectedButton() {
    delete this.deleteSelecteButton;
    return this.deleteSelecteButton =
    document.getElementById('delete-selected-messages');
  },

  get doneButton() {
    delete this.doneButton;
    return this.doneButton = document.getElementById('messages-done-button');
  },

  get headerTitle() {
    delete this.headerTitle;
    return this.headerTitle = document.getElementById('header-text');
  },

  get editHeader() {
      delete this.editHeader;
      return this.editHeader = document.getElementById('messages-edit-title');
  },

  init: function thui_init() {
    this.delNumList = [];
    this.pendingDelList = [];
    this.selectedInputList = [];
    // TODO: Please replace the pending icon with exclamation mark.
    this.sendIcons = {
      sending: 'style/images/spinningwheel_small_animation.gif',
      pending: 'style/images/icons/clear.png'
    };
    this.sendButton.addEventListener('click', this.sendMessage.bind(this));
    this.pickButton.addEventListener('click', this.pickContact.bind(this));
    this.deleteAllButton.addEventListener('click',
      this.deleteAllMessages.bind(this));
    this.deleteSelectedButton.addEventListener('click',
      this.deleteMessages.bind(this));
    this.input.addEventListener('input', this.updateInputHeight.bind(this));
    this.contactInput.addEventListener('input', this.searchContact.bind(this));
    this.doneButton.addEventListener('click', this.executeDeletion.bind(this));
    this.headerTitle.addEventListener('click', this.activateContact.bind(this));
    this.clearButton.addEventListener('click', this.clearContact.bind(this));
    this.view.addEventListener('click', this);
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
    var inputCss = window.getComputedStyle(input, null);
    var inputMaxHeight = parseInt(inputCss.getPropertyValue('max-height'));
    if (input.scrollHeight > inputMaxHeight) {
      return;
    }

    input.style.height = null;
    // If the scroll height is smaller than original offset height, we keep
    // offset height to keep original height, otherwise we use scroll height
    // with additional margin for preventing scroll bar.
    input.style.height = input.offsetHeight > input.scrollHeight ?
      input.offsetHeight + 'px' : input.scrollHeight + 8 + 'px';

    var newHeight = input.getBoundingClientRect().height;
    // Add 1 rem to fit the margin top and bottom space.
    var bottomToolbarHeight = (newHeight / Utils.getFontSize() + 1.0) + 'rem';
    var bottomToolbar =
        document.querySelector('.new-sms-form');

    bottomToolbar.style.height = bottomToolbarHeight;

    this.view.style.bottom = bottomToolbarHeight;
    this.scrollViewToBottom();
  },
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createHeader: function thui_createHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('h2');
    // Append 'time-update' state
    headerHTML.setAttribute('data-time-update', true);
    headerHTML.setAttribute('data-time', timestamp);
    // Add text
    headerHTML.innerHTML = Utils.getHeaderDate(timestamp);
    // Append to DOM
    ThreadUI.view.appendChild(headerHTML);
  },
  updateHeaderData: function thui_updateHeaderData(number) {
    ThreadUI.title.innerHTML = number;
    ContactDataManager.getContactData(number, function gotContact(contact) {
      if (contact && contact.length > 0) {
        ThreadUI.title.innerHTML = contact[0].name || _('unknown-contact');
      }
    });
  },
  renderMessages: function thui_renderMessages(messages, callback) {
    // Update Header
    ThreadUI.updateHeaderData(MessageManager.currentNum);
    // Sorting messages reverse
    messages.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });
    // Clean list of messages
    ThreadUI.view.innerHTML = '';
    // Update header index
    ThreadUI.headerIndex = 0;
    // Init readMessages array
    ThreadUI.readMessages = [];
    // Per each message I will append DOM element
    messages.forEach(ThreadUI.appendMessage);
    // Update read messages if necessary
    if (ThreadUI.readMessages.length > 0) {
      MessageManager.markMessagesRead(ThreadUI.readMessages, 'true',
        function() {
        MessageManager.getMessages(ThreadListUI.renderThreads);
      });
    }
    // Boot update of headers
    Utils.updateHeaderScheduler();
    // Callback when every message is appended
    if (callback) {
      callback();
    }
  },
  appendMessage: function thui_appendMessage(message, callback) {
    if (!message.read) {
      ThreadUI.readMessages.push(message.id);
    }
    // Create DOM Element
    var messageDOM = document.createElement('div');
    // Add class
    messageDOM.classList.add('message-block');

    // Get data for rendering
    var outgoing = (message.delivery == 'sent' ||
      message.delivery == 'sending');
    var className = (outgoing ? 'sent' : 'received');
    var timestamp = message.timestamp.getTime();
    var bodyText = message.body;
    var bodyHTML = Utils.escapeHTML(bodyText);
    messageDOM.id = timestamp;
    var htmlStructure = '<span class="bubble-container ' + className + '">' +
                        '<div class="bubble">' + bodyHTML + '</div>' +
                        '</span>';
    // Add 'gif' if necessary
    if (message.delivery == 'sending') {
      messageDOM.addEventListener('click',
        ThreadUI.resendMessage.bind(ThreadUI, message));
      htmlStructure += '<span class="message-option">' +
      '<img src="' + (message.showAnimation ? ThreadUI.sendIcons.sending :
        ThreadUI.sendIcons.pending) + '" class="gif">' +
                        '</span>';
      //Add edit options for pending
      htmlStructure += '<span class="message-option msg-checkbox">' +
                        '  <input value="ts_' + timestamp +
                        '" type="checkbox">' +
                        '  <span></span>' +
                      '</span>';
    } else {
      //Add edit options
      htmlStructure += '<span class="message-option msg-checkbox">' +
                        '  <input value="id_' + message.id +
                        '" type="checkbox">' +
                        '  <span></span>' +
                      '</span>';
    }
    // Add structure to DOM element
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
    ThreadUI.scrollViewToBottom();
    if (callback) {
      callback;
    }
  },

  cleanForm: function thui_cleanForm() {
    this.input.innerHTML = '';
    var inputs = this.view.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    this.delNumList = [];
    this.selectedInputList = [];
    this.editHeader.innerHTML = _('editMode');
    this.deleteSelectedButton.classList.add('disabled');
  },

  clearContact: function thui_clearContact() {
    this.contactInput.value = '';
    this.view.innerHTML = '';
  },

  deleteAllMessages: function thui_deleteAllMessages() {
    var response = window.confirm(_('deleteAll-confirmation'));
    if (response) {
      this.delNumList = [];
      this.pendingDelList = [];
      var tempTSList = [];

      var inputs = this.view.querySelectorAll('input[type="checkbox"]');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].parentNode.parentNode.classList.add('undo-candidate');
        var inputValue = inputs[i].value;
        if (inputValue.indexOf('ts_') != -1) {
          var valueParsed = inputValue.replace('ts_', '');
          tempTSList.push(parseFloat(valueParsed));
        } else {
          var valueParsed = inputValue.replace('id_', '');
          ThreadUI.delNumList.push(parseFloat(valueParsed));
        }
      }
      MessageManager.getMessages(function(messages) {
        for (var i = 0; i < messages.length; i++) {
          var message = messages[i];
          if (message.delivery == 'sending') {
            if (tempTSList.indexOf(message.timestamp.getTime()) != -1) {
              ThreadUI.pendingDelList.push(message);
            }
          }
        }
        ThreadUI.executeDeletion();
      });
    }
  },

  deleteMessages: function thui_deleteMessages() {
    ThreadUI.delNumList = [];
    ThreadUI.pendingDelList = [];
    var tempTSList = [];
    var inputs = ThreadUI.selectedInputList;
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].parentNode.parentNode.classList.add('undo-candidate');
      var inputValue = inputs[i].value;
      if (inputValue.indexOf('ts_') != -1) {
        var valueParsed = inputValue.replace('ts_', '');
        tempTSList.push(parseFloat(valueParsed));
      } else {
        var valueParsed = inputValue.replace('id_', '');
        ThreadUI.delNumList.push(parseFloat(valueParsed));
      }
    }
    MessageManager.getMessages(function(messages) {
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        if (message.delivery == 'sending') {
          if (tempTSList.indexOf(message.timestamp.getTime()) != -1) {
            ThreadUI.pendingDelList.push(message);
          }
        }
      }
    });
    // Cleaning
    this.editHeader.innerHTML = _('editMode');
    this.deleteSelectedButton.classList.add('disabled');
  },

  executeDeletion: function thui_executeDeletion() {
    if (ThreadUI.delNumList.length + ThreadUI.pendingDelList.length > 0) {
      MessageManager.deleteMessages(ThreadUI.delNumList, function() {
        //TODO Change this functionality with Steve code
        WaitingScreen.show();
        if (ThreadUI.pendingDelList.length > 0) {
          for (var i = 0; i < ThreadUI.pendingDelList.length; i++) {
            if (i == ThreadUI.pendingDelList.length - 1) {
              // Once everything is removed
              PendingMsgManager.deleteFromMsgDB(ThreadUI.pendingDelList[i],
                function() {
                  var filter = MessageManager.createFilter(
                    MessageManager.currentNum);
                  MessageManager.getMessages(function(messages) {
                    if (messages.length > 0) {
                      // If there are messages yet
                      ThreadUI.renderMessages(messages);
                      MessageManager.getMessages(ThreadListUI.renderThreads,
                                                 null, null, function() {
                        WaitingScreen.hide();
                        window.history.back();
                      });
                    }else {
                      // If there are no more messages (delete all)
                      ThreadUI.view.innerHTML = '';
                      MessageManager.getMessages(ThreadListUI.renderThreads,
                                                 null, null, function() {
                        var mainWrapper =
                          document.getElementById('main-wrapper');
                        WaitingScreen.hide();
                        mainWrapper.classList.remove('edit');
                        window.location.hash = '#thread-list';
                      });
                    }
                },filter);
              });
            } else {
              PendingMsgManager.deleteFromMsgDB(ThreadUI.pendingDelList[i]);
            }
          }
        }else {
          var filter = MessageManager.createFilter(MessageManager.currentNum);
          MessageManager.getMessages(function recoverMessages(messages) {
            if (messages.length > 0) {
              ThreadUI.renderMessages(messages);
              WaitingScreen.hide();
              window.history.back();
            }else {
              ThreadUI.view.innerHTML = '';
              MessageManager.getMessages(ThreadListUI.renderThreads,
                                         null, null, function() {
                var mainWrapper = document.getElementById('main-wrapper');
                WaitingScreen.hide();
                mainWrapper.classList.remove('edit');
                window.location.hash = '#thread-list';
              });
            }
          },filter);
        }

      });
    } else {
      window.history.back();
    }
  },

  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (evt.target.type == 'checkbox') {
          if (evt.target.checked) {
            ThreadUI.selectedInputList.push(evt.target);
          } else {
            ThreadUI.selectedInputList.splice(
                            ThreadUI.selectedInputList.indexOf(evt.target), 1);
          }
          var selected = ThreadUI.selectedInputList.length;
          if (selected > 0) {
            ThreadUI.deleteSelectedButton.classList.remove('disabled');
            var total = selected - ThreadUI.delNumList.length -
              ThreadUI.pendingDelList.length;
            this.editHeader.innerHTML = _('selected', {n: total});
          } else {
            ThreadUI.deleteSelectedButton.classList.add('disabled');
            this.editHeader.innerHTML = _('editMode');
          }
        }
          break;
    }
  },
  cleanFields: function thui_cleanFields() {
    this.contactInput.value = '';
    this.input.value = '';
    this.updateInputHeight();
  },

  sendMessage: function thui_sendMessage(resendText) {
    // Retrieve num depending on hash
    var hash = window.location.hash;
    // Depending where we are, we get different num
    if (hash == '#new') {
      var num = this.contactInput.value;
    } else {
      var num = MessageManager.getNumFromHash();
    }
    // Retrieve text
    var text = this.input.value || resendText;
    // If we have something to send
    if (num != '' && text != '') {
      // Create 'PendingMessage'
      var tempDate = new Date();
      var message = {
        sender: null,
        receiver: num,
        delivery: 'sending',
        body: text,
        read: 1,
        timestamp: tempDate
      };

      var self = this;
      // Save the message into pendind DB before send.
      PendingMsgManager.saveToMsgDB(message, function onsave(msg) {
        if (!msg) {
          // TODO: We need to handle the pending message save failed.
          console.log('Message app - pending message save failed!');
          PendingMsgManager.saveToMsgDB(message, this);
        } else {
          // Clean Fields
          ThreadUI.cleanFields();
          // Update ThreadListUI when new message in pending database.
          if (window.location.hash == '#new') {
            window.location.hash = '#num=' + num;
          } else {
            // Append to DOMf
            message.showAnimation = true;
            ThreadUI.appendMessage(message, function() {
              Utils.updateHeaders();
            });
          }
          MessageManager.getMessages(ThreadListUI.renderThreads);
        }

      });

      MessageManager.send(num, text, function onsent(msg) {
        if (!msg) {
          self.resendMessage(message);
        } else {
          var root = document.getElementById(message.timestamp.getTime());
          if (root) {

            root.removeChild(root.childNodes[1]);
            var inputs = root.querySelectorAll('input[type="checkbox"]');
            if (inputs) {
              inputs[0].value = 'id_' + msg.id;
            }

          }
          // Remove the message from pending message DB since it could be sent
          // successfully.
          PendingMsgManager.deleteFromMsgDB(message, function ondelete(msg) {
            if (!msg) {
              //TODO: Handle message delete failed in pending DB.
            }
          });
        }
      });
    }
  },

  resendMessage: function thui_resendMessage(message) {
    if (window.location.hash == '#edit') {
      return;
    }
    var resendConfirmStr = _('resend-confirmation');
    var result = confirm(resendConfirmStr);
    if (result) {
      // Remove the message from pending message DB before resend.
      PendingMsgManager.deleteFromMsgDB(message, function ondelete(msg) {
        var filter = MessageManager.createFilter(message.receiver);
        MessageManager.getMessages(function(messages) {
          ThreadUI.renderMessages(messages);
          MessageManager.getMessages(ThreadListUI.renderThreads);
        }, filter, true);
      });
      window.setTimeout(ThreadUI.sendMessage.bind(ThreadUI, message.body), 500);
    } else if (message.showAnimation) {
      // TODO: We need to replace the timestamp with ID when message deletion
      //       refine in the future.
      var queryStr = 'div[id="' + message.timestamp.valueOf() + '"] img.gif';
      var emt = ThreadUI.view.querySelector(queryStr);
      emt.src = ThreadUI.sendIcons.pending;
      message.showAnimation = false;
    }
  },

  renderContactData: function thui_renderContactData(contact) {
    // Create DOM element
    var threadHTML = document.createElement('div');
    threadHTML.classList.add('item');

    // Retrieve info from thread
    var name = Utils.escapeHTML(contact.name.toString());
    var number = Utils.escapeHTML(contact.tel[0].number.toString());
    // Create HTML structure
    var structureHTML =
            '  <a href="#num=' + contact.tel[0].number + '">' +
            '    <div class="name">' + name + '</div>' +
            '    <div class="number">' + number + '</div>' +
            '  </a>';
    // Update HTML and append
    threadHTML.innerHTML = structureHTML;
    ThreadUI.view.appendChild(threadHTML);
  },

  searchContact: function thui_searchContact() {
    var input = this.contactInput;
    var string = input.value;
    var self = this;
    this.view.innerHTML = '';
    if (!string) {
      return;
    }
    ContactDataManager.searchContactData(string, function gotContact(contacts) {
      if (!contacts || contacts.length == 0) {
        return;
      }
      contacts.forEach(self.renderContactData);
    });
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
  },

  activateContact: function thui_activateContact() {
    try {
      //TODO: We should provide correct params for contact activiy handler.
      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact'
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};

var WaitingScreen = {
  get loading() {
    delete this.loading;
    return this.loading = document.getElementById('loading');
  },
  get loadingHeader() {
    delete this.loadingHeader;
    return this.loadingHeader = document.getElementById('loading-header');
  },
  show: function ws_show() {
    this.loading.classList.add('show-loading');
  },
  hide: function ws_hide() {
    this.loading.classList.remove('show-loading');
  },
  update: function ws_update(text) {
    this.loadingHeader.innerHTML = text;
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

/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  init: function mm_init() {
    // Init PhoneNumberManager for solving country code issue.
    PhoneNumberManager.init();
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
            var messageInput = document.getElementById('message-to-send');
            var receiverInput = document.getElementById('receiver-input');
            document.getElementById('messages-container').innerHTML = '';
            messageInput.innerHTML = '';
            receiverInput.value = '';
            threadMessages.classList.add('new');
            MessageManager.slide(function() {
              messageInput.focus();
            });
            break;
          case '#thread-list':
            if (mainWrapper.classList.contains('edit')) {
              mainWrapper.classList.remove('edit');
            } else if (threadMessages.classList.contains('new')) {
              MessageManager.slide(function() {
                threadMessages.classList.remove('new');
              });
            } else {
              MessageManager.slide(function() {
                if (MessageManager.activityTarget) {
                  window.location.hash =
                    '#num=' + MessageManager.activityTarget;
                  delete MessageManager.activityTarget;
                }
              });
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
                  filter, null, function() {
                   MessageManager.slide(function() {
                      document.getElementById('message-to-send').focus();
                    });
                  });
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
    if (num) {
      filter.numbers = PhoneNumberManager.getOptionalNumbers(num);
    } else {
      filter.numbers = [''];
    }
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
        var numNormalized = PhoneNumberManager.
          getNormalizedInternationalNumber(filterNum);
        //TODO: Refine the pending message append with non-blocking method.
        PendingMsgManager.getMsgDB(numNormalized, function msgCb(pendingMsgs) {
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

  send: function mm_send(number, text, callback, errorHandler) {
    var req = navigator.mozSms.send(number, text);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
      errorHandler(number);
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
  },

  reopenSelf: function reopenSelf(number) {
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch();
      if (number) {
        window.location.hash = '#num=' + number;
      }
    }
  }
};

var ThreadListUI = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('thread-list-container');
  },
  get selectAllButton() {
    delete this.selectAllButton;
    return this.selectAllButton = document.getElementById('select-all-threads');
  },
  get deselectAllButton() {
    delete this.deselectAllButton;
    return this.deselectAllButton =
                                document.getElementById('deselect-all-threads');
  },
  get deleteButton() {
    delete this.deleteButton;
    return this.deleteButton = document.getElementById('threads-delete-button');
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
    this.selectAllButton.addEventListener('click',
                                          this.selectAllThreads.bind(this));
    this.deselectAllButton.addEventListener('click',
                                            this.deselectAllThreads.bind(this));
    this.deleteButton.addEventListener('click',
                                       this.executeDeletion.bind(this));
    this.view.addEventListener('click', this);
   },

  updateMsgWithContact: function thlui_updateMsgWithContact(number, contact) {
    var name =
            this.view.querySelector('a[data-num="' + number + '"] div.name');
    if (contact && contact.length > 0) {
      var choosenContact = contact[0];
      var name =
              this.view.querySelector('a[data-num="' + number + '"] div.name');
      var selector = 'a[data-num="' + number + '"] div.photo img';
      var photo = this.view.querySelector(selector);
      if (name && choosenContact.name && choosenContact.name != '') {
        name.innerHTML = choosenContact.name;
      }

      if (photo && choosenContact.photo && choosenContact.photo[0]) {
        var photoURL = URL.createObjectURL(choosenContact.photo[0]);
        photo.src = photoURL;
      }
    } else {
      name.innerHTML = number;
    }
  },

  handleEvent: function thlui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (evt.target.type == 'checkbox') {
          ThreadListUI.clickInput(evt.target);
          ThreadListUI.checkInputs();
        }
        break;
    }
  },

  clickInput: function thlui_clickInput(target) {
    if (target.checked) {
      ThreadListUI.selectedInputList.push(target);
    } else {
      ThreadListUI.selectedInputList.splice(
                ThreadListUI.selectedInputList.indexOf(target), 1);
    }
  },

  checkInputs: function thlui_checkInputs() {
    var selected = ThreadListUI.selectedInputList.length;
    var allInputs =
            ThreadListUI.view.querySelectorAll('input[type="checkbox"]');
    if (selected == allInputs.length) {
      ThreadListUI.selectAllButton.classList.add('disabled');
    } else {
      ThreadListUI.selectAllButton.classList.remove('disabled');
    }
    if (selected > 0) {
      ThreadListUI.deselectAllButton.classList.remove('disabled');
      ThreadListUI.deleteButton.classList.remove('disabled');
      this.editHeader.innerHTML = _('selected', {n: selected});
    } else {
      ThreadListUI.deselectAllButton.classList.add('disabled');
      ThreadListUI.deleteButton.classList.add('disabled');
      this.editHeader.innerHTML = _('editMode');
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
    this.editHeader.innerHTML = _('editMode');
    this.deselectAllButton.classList.add('disabled');
    this.selectAllButton.classList.remove('disabled');
    this.deleteButton.classList.add('disabled');
  },

  selectAllThreads: function thlui_selectAllThreads() {
    var inputs =
            this.view.querySelectorAll('input[type="checkbox"]:not(:checked)');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = true;
      ThreadListUI.clickInput(inputs[i]);
    }
    ThreadListUI.checkInputs();
  },

  deselectAllThreads: function thlui_deselectAllThreads() {
    var inputs = this.view.querySelectorAll('input[type="checkbox"]:checked');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      ThreadListUI.clickInput(inputs[i]);
    }
    ThreadListUI.checkInputs();
  },

  executeDeletion: function thlui_executeDeletion() {
    var response = window.confirm(_('deleteThreads-confirmation'));
    if (response) {
      WaitingScreen.show();
      this.delNumList = [];
      this.pendingDelList = [];
      var filters = [];
      var inputs = ThreadListUI.selectedInputList;
      for (var i = 0; i < inputs.length; i++) {
        var filter = MessageManager.createFilter(inputs[i].value);
        filters.push(filter);
      }
      var fillList = function fillList(filters, callback) {
        var currentFilter = filters.pop();
        MessageManager.getMessages(function gotMessages(messages) {
          for (var j = 0; j < messages.length; j++) {
            if (messages[j].delivery == 'sending') {
              ThreadListUI.pendingDelList.push(messages[j]);
            } else {
              ThreadListUI.delNumList.push(parseFloat(messages[j].id));
            }
          }
          if (filters.length > 0) {
            fillList(filters, callback);
          } else {
            MessageManager.deleteMessages(ThreadListUI.delNumList,
                                          function() {
              if (ThreadListUI.pendingDelList.length > 0) {
                for (var j = 0; j < ThreadListUI.pendingDelList.length; j++) {
                  if (j == ThreadListUI.pendingDelList.length - 1) {
                    PendingMsgManager.deleteFromMsgDB(
                      ThreadListUI.pendingDelList[j], function() {
                      MessageManager.getMessages(
                        function recoverMessages(messages) {
                          ThreadListUI.renderThreads(messages);
                          WaitingScreen.hide();
                          window.location.hash = '#thread-list';
                      });
                    });
                  } else {
                    PendingMsgManager.deleteFromMsgDB(
                      ThreadListUI.pendingDelList[j]);
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
          }
        }, currentFilter);
      };
      fillList(filters, fillList);
    }
  },

  renderThreads: function thlui_renderThreads(messages, callback) {
    ThreadListUI.view.innerHTML = '';
    if (messages.length > 0) {
      ThreadListUI.iconEdit.classList.remove('disabled');
      var threadIds = [],
          headerIndex,
          unreadThreads = [];
      for (var i = 0; i < messages.length; i++) {

        var message = messages[i];
        var time = message.timestamp.getTime();
        var num = message.delivery == 'received' ?
        message.sender : message.receiver;
        var numNormalized =
          PhoneNumberManager.getNormalizedInternationalNumber(num);
        if (!message.read) {
          if (unreadThreads.indexOf(numNormalized) == -1) {
            unreadThreads.push(numNormalized);
          }
        }
        if (threadIds.indexOf(numNormalized) == -1) {
          var thread = {
            'body': message.body,
            'name': numNormalized,
            'num': numNormalized,
            'timestamp': time,
            'unreadCount': !message.read ? 1 : 0,
            'id': numNormalized
          };
          if (threadIds.length == 0) {
            headerIndex = Utils.getDayDate(time);
            ThreadListUI.createNewHeader(time);
          }else {
            var tmpIndex = Utils.getDayDate(time);
            if (tmpIndex < headerIndex) {
              ThreadListUI.createNewHeader(time);
              headerIndex = tmpIndex;
            }
          }
          threadIds.push(numNormalized);
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
            '   <p>' + _('noMessages-title') + '</p>' +
            '   <p>' + _('noMessages-text') + '</p>' +
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
            '  <label class="checkbox-container">' +
            '   <input type="checkbox" value="' + thread.num + '">' +
            '   <span></span>' +
            '  </label>';
    // Update HTML and append
    threadHTML.innerHTML = structureHTML;
    this.view.appendChild(threadHTML);

    // Get the contact data for the number
    ContactDataManager.getContactData(thread.num, function gotContact(contact) {
      ThreadListUI.updateMsgWithContact(thread.num, contact);
    });
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createNewHeader: function thlui_createNewHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('h2');
    // Append 'time-update' state
    headerHTML.dataset.timeUpdate = true;
    headerHTML.dataset.time = timestamp;
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

  get selectAllButton() {
    delete this.deleteAllButton;
    return this.deleteAllButton =
                                document.getElementById('select-all-messages');
  },

  get deselectAllButton() {
    delete this.deselectAllButton;
    return this.deselectAllButton =
                              document.getElementById('deselect-all-messages');
  },

  get deleteButton() {
    delete this.doneButton;
    return this.doneButton = document.getElementById('messages-delete-button');
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
    this.selectAllButton.addEventListener('click',
      this.selectAllMessages.bind(this));
    this.deselectAllButton.addEventListener('click',
      this.deselectAllMessages.bind(this));
    this.input.addEventListener('input', this.updateInputHeight.bind(this));
    this.contactInput.addEventListener('input', this.searchContact.bind(this));
    this.deleteButton.addEventListener('click',
                                       this.executeDeletion.bind(this));
    this.title.addEventListener('click', this.activateContact.bind(this));
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
      input.offsetHeight / Utils.getFontSize() + 'rem' :
      input.scrollHeight / Utils.getFontSize() + 0.8 + 'rem';

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
    headerHTML.dataset.timeUpdate = true;
    headerHTML.dataset.time = timestamp;
    // Add text
    headerHTML.innerHTML = Utils.getHeaderDate(timestamp);
    // Append to DOM
    ThreadUI.view.appendChild(headerHTML);
  },

  updateHeaderData: function thui_updateHeaderData(number) {
    var self = this;
    // Add data to contact activity interaction
    self.title.dataset.phoneNumber = number;

    ContactDataManager.getContactData(number, function gotContact(contacts) {
      //TODO what if different contacts with same number?
      Utils.getPhoneDetails(number,
                            contacts[0],
                            function returnedDetails(details) {
        if (details.isContact) {
          self.title.dataset.isContact = true;
        } else {
          delete self.title.dataset.isContact;
        }
        self.title.innerHTML = details.title || number;
        var carrierTag = document.getElementById('contact-carrier');
        if (details.carrier) {
          carrierTag.innerHTML = details.carrier;
          carrierTag.classList.remove('hide');
        } else {
          carrierTag.classList.add('hide');
        }
      });
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
    var htmlStructure = '';
    // Adding edit options to the left side
    if (message.delivery == 'sending') {
      //Add edit options for pending
      htmlStructure += '<label class="message-option msg-checkbox">' +
                        '  <input value="ts_' + timestamp +
                        '" type="checkbox">' +
                        '  <span></span>' +
                      '</label>';
    } else {
      //Add edit options
      htmlStructure += '<label class="message-option msg-checkbox">' +
                        '  <input value="id_' + message.id +
                        '" type="checkbox">' +
                        '  <span></span>' +
                      '</label>';
    }
    htmlStructure += '<span class="bubble-container ' + className + '">' +
                        '<div class="bubble">' + bodyHTML + '</div>' +
                        '</span>';

    // Add 'gif' if necessary
    if (message.delivery == 'sending') {
      htmlStructure += '<span class="message-option">' +
      '<img src="' + (!message.error ? ThreadUI.sendIcons.sending :
        ThreadUI.sendIcons.pending) + '" class="gif">' +
                        '</span>';
    }
    // Add structure to DOM element
    messageDOM.innerHTML = htmlStructure;
    if (message.error) {
      messageDOM.addEventListener('click', function() {
        var hash = window.location.hash;
        if (hash != '#edit') {
          ThreadUI.resendMessage(message);
        }
      });
    }
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
    if (callback && callback instanceof Function) {
      callback();
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
    this.selectAllButton.classList.remove('disabled');
    this.deselectAllButton.classList.add('disabled');
    this.deleteButton.classList.add('disabled');
  },

  clearContact: function thui_clearContact() {
    this.contactInput.value = '';
    this.view.innerHTML = '';
  },

  selectAllMessages: function thui_selectAllMessages() {
    var inputs =
            this.view.querySelectorAll('input[type="checkbox"]:not(:checked)');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = true;
      ThreadUI.clickInput(inputs[i]);
    }
    ThreadUI.checkInputs();
  },

  deselectAllMessages: function thui_deselectAllMessages() {
    var inputs =
            this.view.querySelectorAll('input[type="checkbox"]:checked');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      ThreadUI.clickInput(inputs[i]);
    }
    ThreadUI.checkInputs();
  },

  executeDeletion: function thui_executeDeletion() {
    var response = window.confirm(_('deleteMessages-confirmation'));
    if (response) {
      WaitingScreen.show();
      this.delNumList = [];
      this.pendingDelList = [];
      var tempTSList = [];
      var inputs = ThreadUI.selectedInputList;
      for (var i = 0; i < inputs.length; i++) {
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
        // Now we have our lists filled, we start the deletion
        MessageManager.deleteMessages(ThreadUI.delNumList, function() {
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
                MessageManager.getMessages(ThreadListUI.renderThreads,
                                           null, null, function() {
                  WaitingScreen.hide();
                  window.history.back();
                });
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
      });
    }
  },

  clickInput: function thui_clickInput(target) {
    if (target.checked) {
      ThreadUI.selectedInputList.push(target);
      // Adding red bubble
      target.parentNode.parentNode.classList.add('selected');
    } else {
      ThreadUI.selectedInputList.splice(
                      ThreadUI.selectedInputList.indexOf(target), 1);
      // Removing red bubble
      target.parentNode.parentNode.classList.remove('selected');
    }
  },

  checkInputs: function thui_checkInputs() {
    var selected = ThreadUI.selectedInputList.length;
    var allInputs = this.view.querySelectorAll('input[type="checkbox"]');
    if (selected == allInputs.length) {
      ThreadUI.selectAllButton.classList.add('disabled');
    } else {
      ThreadUI.selectAllButton.classList.remove('disabled');
    }
    if (selected > 0) {
      ThreadUI.deselectAllButton.classList.remove('disabled');
      ThreadUI.deleteButton.classList.remove('disabled');
      this.editHeader.innerHTML = _('selected', {n: selected});
    } else {
      ThreadUI.deselectAllButton.classList.add('disabled');
      ThreadUI.deleteButton.classList.add('disabled');
      this.editHeader.innerHTML = _('editMode');
    }
  },

  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (evt.target.type == 'checkbox') {
          ThreadUI.clickInput(evt.target);
          ThreadUI.checkInputs();
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
    var settings = window.navigator.mozSettings,
        throwGeneralError;

    throwGeneralError = function() {
      CustomDialog.show(
        _('sendGeneralErrorTitle'),
        _('sendGeneralErrorBody'),
        {
          title: _('sendGeneralErrorBtnOk'),
          callback: function() {
            CustomDialog.hide();
          }
        }
      );
    };

    if (settings) {

      var req = settings.createLock().get('ril.radio.disabled');
      req.addEventListener('success', (function onsuccess() {
        var status = req.result['ril.radio.disabled'];

        // Retrieve num depending on hash
        var hash = window.location.hash;
        // Depending where we are, we get different num
        if (hash == '#new') {
          var num = this.contactInput.value;
        } else {
          var num = MessageManager.getNumFromHash();
        }
        var numNormalized =
          PhoneNumberManager.getNormalizedInternationalNumber(num);
        // Retrieve text
        var text = this.input.value || resendText;
        // If we have something to send
        if (numNormalized != '' && text != '') {
          // Create 'PendingMessage'
          var tempDate = new Date();
          var message = {
            sender: null,
            receiver: numNormalized,
            delivery: 'sending',
            body: text,
            read: 1,
            timestamp: tempDate
          };
          var self = this;
          if (!status) {
            message.error = false;
            // Save the message into pendind DB before send.
            PendingMsgManager.saveToMsgDB(message, function onsave(msg) {
              ThreadUI.cleanFields();
              if (window.location.hash == '#new') {
                window.location.hash = '#num=' + num;
              } else {
                // Append to DOM
                ThreadUI.appendMessage(message, function() {
                   // Call to update headers
                  Utils.updateHeaders();

                });
              }
              MessageManager.getMessages(ThreadListUI.renderThreads);
              MessageManager.send(num, text, function onsent(msg) {
                var root = document.getElementById(message.timestamp.getTime());
                if (root) {
                  root.removeChild(root.childNodes[2]);
                  var inputs = root.querySelectorAll('input[type="checkbox"]');
                  if (inputs) {
                    inputs[0].value = 'id_' + msg.id;
                  }
                }
                // Remove the message from pending message DB since it
                // could be sent successfully.
                PendingMsgManager.deleteFromMsgDB(message,
                  function ondelete(msg) {
                    if (!msg) {
                      //TODO: Handle message delete failed in pending DB.
                    }
                });
              }, function onerror() {
                var root = document.getElementById(message.timestamp.getTime());
                PendingMsgManager.deleteFromMsgDB(message,
                  function ondelete(msg) {
                    message.error = true;
                    PendingMsgManager.saveToMsgDB(message,
                      function onsave(msg) {
                        var filter = MessageManager.createFilter(
                          message.receiver);
                        MessageManager.getMessages(function(messages) {
                          ThreadUI.renderMessages(messages);
                          MessageManager.getMessages(
                            ThreadListUI.renderThreads);
                        }, filter);
                    });
                });
              });
            });
          } else {
            message.error = true;
            // Save the message into pendind DB before send.
            PendingMsgManager.saveToMsgDB(message, function onsave(msg) {
              ThreadUI.cleanFields();
              if (window.location.hash == '#new') {
                window.location.hash = '#num=' + num;
              } else {
                // Append to DOM
                ThreadUI.appendMessage(message, function() {
                   // Call to update headers
                  Utils.updateHeaders();
                });
              }
              CustomDialog.show(
                _('sendFlightModeTitle'),
                _('sendFlightModeBody'),
                {
                  title: _('sendFlightModeBtnOk'),
                  callback: function() {
                    CustomDialog.hide();
                  }
                }
              );
              MessageManager.getMessages(ThreadListUI.renderThreads);
            });
          }
        }
      }).bind(this));

      req.addEventListener('error', function onerror() {
        throwGeneralError();
      });
    } else {
      throwGeneralError();
    }
  },

  resendMessage: function thui_resendMessage(message) {
    var resendConfirmStr = _('resend-confirmation');
    var result = confirm(resendConfirmStr);
    if (result) {
      // Remove the message from pending message DB before resend.
      PendingMsgManager.deleteFromMsgDB(message, function ondelete(msg) {
        var filter = MessageManager.createFilter(message.receiver);
        MessageManager.getMessages(function(messages) {
          ThreadUI.renderMessages(messages);
          MessageManager.getMessages(ThreadListUI.renderThreads);
          ThreadUI.sendMessage(message.body);
        }, filter, true);
      });
    }
  },

  renderContactData: function thui_renderContactData(contact) {
    // Retrieve info from thread
    var self = this;
    var tels = contact.tel;
    for (var i = 0; i < tels.length; i++) {
      Utils.getPhoneDetails(tels[i].value,
                            contact,
                            function gotDetails(details) {
        var name = (contact.name || details.title).toString();
        //TODO ask UX if we should use type+carrier or just number
        var number = tels[i].value.toString();
        var input = self.contactInput.value;
        // For name, as long as we do a startsWith on API, we want only to show
        // highlight of the startsWith also
        var regName = new RegExp('\\b' + input, 'ig');
        // For number we search in any position to avoid country code issues
        var regNumber = new RegExp(input, 'ig');
        if (!(name.match(regName) || number.match(regNumber))) {
          return;
        }
        var nameHTML =
            SearchUtils.createHighlightHTML(name, regName, 'highlight');
        var numHTML =
            SearchUtils.createHighlightHTML(number, regNumber, 'highlight');
        // Create DOM element
        var threadHTML = document.createElement('div');
        threadHTML.classList.add('item');


        //TODO Implement algorithm for this part following Wireframes
        // Create HTML structure
        var structureHTML =
                '  <a href="#num=' + number + '">' +
                '    <div class="name">' + nameHTML + '</div>' +
                '    <div class="type">' + numHTML + '</div>' +
                //TODO what if no photo? hide or default?
                '    <div class="photo">' +
                '      <img src="' + details.photoURL + '">' +
                '    </div>' +
                '  </a>';
        // Update HTML and append
        threadHTML.innerHTML = structureHTML;
        ThreadUI.view.appendChild(threadHTML);
      });
    }
  },

  searchContact: function thui_searchContact() {
    var input = this.contactInput;
    var string = input.value;
    var self = this;
    self.view.innerHTML = '';
    if (!string) {
      return;
    }
    ContactDataManager.searchContactData(string, function gotContact(contacts) {
      if (!contacts || contacts.length == 0) {
        return;
      }
      self.view.innerHTML = '';
      contacts.forEach(self.renderContactData.bind(self));
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
      activity.onsuccess = function success() {
        var number = this.result.number;
        MessageManager.reopenSelf(number);
      }
      activity.onerror = function error() {
        MessageManager.reopenSelf();
      }

    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  activateContact: function thui_activateContact() {
    var options = {};
    // Call to 'new' or 'view' depending on existence of contact
    if (this.title.dataset.isContact == 'true') {
      //TODO modify this when 'view' activity is available on contacts
      // options = {
      //   name: 'view',
      //   data: {
      //     type: 'webcontacts/contact'
      //   }
      // };
    } else {
      options = {
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': this.title.dataset.phoneNumber
          }
        }
      };
    }

    try {
      var activity = new MozActivity(options);
      activity.onsuccess = function success() {
        MessageManager.reopenSelf();
      }
      activity.onerror = function error() {
        MessageManager.reopenSelf();
      }
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
  var activityAction = function act_action() {
    var currentLocation = window.location.hash;
    switch (currentLocation) {
      case '#thread-list':
        window.location.hash = '#num=' + number;
        break;
      case '#new':
        window.location.hash = '#num=' + number;
        break;
      case '#edit':
        history.back();
        activityAction();
        break;
      default:
        if (currentLocation.indexOf('#num=') != -1) {
          MessageManager.activityTarget = number;
          window.location.hash = '#thread-list';
        } else {
          window.location.hash = '#num=' + number;
        }
        break;
    }
  };

  if (!document.documentElement.lang) {
    window.addEventListener('localized', function waitLocalized() {
      window.removeEventListener('localized', waitLocalized);
      activityAction();
    });
  } else {
    document.addEventListener('mozvisibilitychange', function waitVisibility() {
      document.removeEventListener('mozvisibilitychange', waitVisibility);
      activityAction();
    });
  }
  activity.postResult({ status: 'accepted' });
});


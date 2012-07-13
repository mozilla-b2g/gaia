/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageManager = {
  init: function mm_init() {
    ThreadUI.init();
    ThreadListUI.init();
    this.getMessages(ThreadListUI.renderThreads);

    if (navigator.mozSms) {
      navigator.mozSms.addEventListener('received', this);
    }
    window.addEventListener('hashchange', this);
    document.addEventListener('mozvisibilitychange', this);
  },
  handleEvent: function mm_handleEvent(event) {
    switch (event.type) {
      case 'received':
        this.getMessages(ThreadListUI.renderThreads);
        var num = this.getNumFromHash();
        if (num) {
          //********************
          //Paint only pending

          var filter = this.createFilter(num);
              
          // ThreadUI.renderMessages(ThreadUI.filter);
          this.getMessages(ThreadUI.renderMessages,filter);

          //********************
        }
        break;

      case 'hashchange':
        var bodyclassList = document.body.classList;
        switch (window.location.hash) {
          case '':
            this.getMessages(ThreadListUI.renderThreads);
            bodyclassList.remove('conversation');
            bodyclassList.remove('conversation-new-msg');
            break;
          case '#edit':
            //TODO Add new style management
            break;
          default:
            var num = this.getNumFromHash();
            alert(num);

            if (num) {
              if(num=='*'){
                document.body.classList.add('conversation-new-msg');
                document.body.classList.add('conversation');
              }else{
                var filter = this.createFilter(num);
                this.getMessages(ThreadUI.renderMessages,filter);
                document.body.classList.remove('conversation-new-msg');
                document.body.classList.add('conversation');
              }
              

              // ThreadUI.renderMessages(num);
            }
          break;
        }
        break;
      // case 'mozvisibilitychange':
      //   if (!document.mozHidden) {
      //     this.getMessages(ThreadListUI.renderThreads);
      //     var num = this.getNumFromHash();
      //     if (num) {
      //       ThreadUI.renderMessages(num);
      //     }
      //   }
      //   break;
    }
  },
  createFilter: function mm_createFilter(num){
    var filter = new MozSmsFilter();
    filter.numbers = [num || ''];
    return filter;
  },
  getNumFromHash: function mm_getNumFromHash() {
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
  },

  updateMsgWithContact: function thlui_updateMsgWithContact(contact) {
    // TODO Update DOM with data retrieved from Contact DB
    // This will be a callback from ContactManager
  },

  renderThreads: function thlui_renderThreads(messages) {
    ThreadListUI.view.innerHTML = '';
    var threadIds = [], headerIndex;
    for (var i = 0; i < messages.length; i++) {
      var num = messages[i].delivery == 'received' ?
      messages[i].sender : messages[i].receiver;
      if (threadIds.indexOf(num) == -1) {
        var thread = {
          'body': messages[i].body,
          'name': num,
          'num': num,
          'timestamp': messages[i].timestamp.getTime(),
          'unreadCount': !messages[i].read ? 1 : 0,
          'id': num
        };
        if (threadIds.length == 0) {
          var currentTS = (new Date()).getTime();
          headerIndex = Utils.getDayDate(currentTS);
          ThreadListUI.createNewHeader(currentTS);
        }else {
          var tmpIndex = Utils.getDayDate(messages[i].timestamp.getTime());
          if (tmpIndex < headerIndex) {
            ThreadListUI.createNewHeader(messages[i].timestamp.getTime());
            headerIndex = tmpIndex;
          }
        }
        threadIds.push(num);
        ThreadListUI.appendThread(thread);
      }
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
    var structureHTML = '  <a href="#num=' + thread.num + '"' +
            '     data-num="' + thread.num + '"' +
            '     data-name="' + dataName + '"' +
            '     data-notempty="' +
                  (thread.timestamp ? 'true' : '') + '"' +
            '     class="' +
                 (thread.unreadCount > 0 ? 'unread' : '') + '">' +
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
            '    <div class="photo"></div>' +
            '  </a>';
    // Update HTML and append
    threadHTML.innerHTML = structureHTML;
    this.view.appendChild(threadHTML);
  },
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createNewHeader: function thlui_createNewHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('div');
    headerHTML.classList.add('groupHeader');

    // Create HTML and append
    var structureHTML = Utils.getHeaderDate(timestamp);
    headerHTML.innerHTML = structureHTML;
    ThreadListUI.view.appendChild(headerHTML);
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
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createHeader: function thui_createHeader(timestamp) {
    // Create DOM Element
    var headerHTML = document.createElement('div');
    headerHTML.classList.add('groupHeader');

    // Create HTML and append
    var structureHTML = Utils.getHeaderDate(timestamp);
    headerHTML.innerHTML = structureHTML;
    ThreadUI.view.appendChild(headerHTML);
  },
  renderMessages: function thui_renderMessages(messages) {
    // alert("RENDER MESSAGES");
    messages.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });
    // alert(messages.length);
    ThreadUI.view.innerHTML = '';
    var headerIndex;
    for (var i = 0; i < messages.length; i++) {
      

      if (i == 0) {
        headerIndex = Utils.getDayDate(messages[i].timestamp.getTime());
        ThreadUI.createHeader(messages[i].timestamp.getTime());
      }else{
        var tmpIndex = Utils.getDayDate(messages[i].timestamp.getTime());
        if (tmpIndex > headerIndex) {
          ThreadUI.createHeader(messages[i].timestamp.getTime());
          headerIndex = tmpIndex;
        }
      }
      ThreadUI.appendMessage(messages[i]);

      

          


    }

    
    // TODO Si estoy en num=* renderizo otro


    // delete ThreadListUI._lastHeader;
    // var self = this;
    // var view = this.view;
    // var bodyclassList = document.body.classList;
    // var currentScrollTop;

    // if (num !== '*') {
    //   var filter = new MozSmsFilter();
    //   filter.numbers = [num || ''];

    //   if (this.filter == num)
    //     currentScrollTop = view.scrollTop;

    //   this.filter = num;
    // } else {
    //   /* XXX: gaia issue #483 (New Message dialog design)
    //           gaia issue #108 (contact picker)
    //   */

    //   this.num.value = '';
    //   this.view.innerHTML = '';
    //   bodyclassList.add('conversation-new-msg');
    //   bodyclassList.add('conversation');
    //   return;
    // }

    // bodyclassList.remove('conversation-new-msg');

    // var receiverId = parseInt(num);

    // var self = this;
    // var options = {
    //   filterBy: ['tel'],
    //   filterOp: 'contains',
    //   filterValue: num
    // };

    // this.num.value = num;
    // this.title.num = num;
    // this.title.textContent = num;

    // ContactDataManager.getContactData(options, function getContact(result) {
    //   var contactImageSrc = 'style/images/contact-placeholder.png';
    //   if (result && result.length > 0) {
    //     var contact = result[0];
    //     self.title.textContent = contact.name[0];
    //     //TODO: apply the real contact image:
    //     //contactImageSrc = contact.photo;
    //   }
    //   var images = self.view.querySelectorAll('.photo img');
    //   for (var i = 0; i < images.length; i++)
    //     images[i].src = contactImageSrc;
    // });

    // MessageManager.getMessages(function mm_getMessages(messages) {
    //   /** QUICK and dirty fix for the timestamp issues,
    //    * it seems that API call does not give the messages ordered
    //    * so we need to sort the array
    //    */
    //   messages.sort(function(a, b) {
    //     return a.timestamp - b.timestamp;
    //   });

    //   var lastMessage = messages[messages.length - 1];
    //   if (pendingMsg &&
    //       (!lastMessage || lastMessage.id !== pendingMsg.id))
    //     messages.push(pendingMsg);

    //   var fragment = '';
    //   var unreadList = [];

    //   for (var i = 0; i < messages.length; i++) {
    //     var msg = messages[i];
    //     if (!msg.read)
    //       unreadList.push(msg.id);

    //     // Add a grouping header if necessary
    //     // var header = ThreadListUI.createNewHeader(msg) || '';
    //     // fragment += header;

    //     fragment += self.createMessage(msg);
    //   }

    //   view.innerHTML = fragment;
    //   self.scrollViewToBottom(currentScrollTop);

    //   bodyclassList.add('conversation');

    //   MessageManager.markMessagesRead(unreadList, true, function markMsg() {
    //     // TODO : Since spec do not specify the behavior after mark success or
    //     //        error, we do nothing currently.
    //   });
    // }, filter, true);
  },
  appendMessage: function thui_appendMessage(message){
    var messageDOM = document.createElement('div');
    messageDOM.classList.add('message-block');
    var outgoing = (message.delivery == 'sent' ||
      message.delivery == 'sending');
    var className = (outgoing ? 'sender' : 'receiver') + '"';
    var timestamp = message.timestamp.getTime();

    var htmlStructure = '  <div class="message-container ' + className + '>' +
               '    <div class="message-bubble"></div>' +
               '    <div class="time" data-time="' + timestamp + '">' +
                      Utils.getHourMinute(message.timestamp) +
               '    </div>' +
               '    <div class="text">' + message.body + '</div>' +
               '  </div>';
    messageDOM.innerHTML = htmlStructure;
    ThreadUI.view.appendChild(messageDOM);
  },
  // createMessage: function thui_createMessage(message) {
  //   var dataId = message.id; // uuid
  //   var outgoing = (message.delivery == 'sent' ||
  //     message.delivery == 'sending');
  //   var num = outgoing ? message.sender : message.receiver;
  //   var dataNum = num;

  //   var className = (outgoing ? 'sender' : 'receiver') + '"';
  //   if (message.delivery == 'sending')
  //     className = 'sender pending"';

  //   var pic = 'style/images/contact-placeholder.png';

  //   //Split body in different lines if the sms contains \n
  //   var msgLines = message.body.split('\n');
  //   //Apply the escapeHTML body to each line
  //   msgLines.forEach(function(line, index) {
  //     msgLines[index] = Utils.escapeHTML(line);
  //   });
  //   //Join them back with <br />
  //   var body = msgLines.join('<br />');
  //   var timestamp = message.timestamp.getTime();

  //   return '<div class="message-block" ' + 'data-num="' + dataNum +
  //          '" data-id="' + dataId + '">' +
  //          '  <label class="fake-checkbox">' +
  //          '    <input data-id="' + dataId + '" type="checkbox"/>' +
  //          '    <span></span>' +
  //          '  </label>' +
  //          '  <div class="message-container ' + className + '>' +
  //          '    <div class="message-bubble"></div>' +
  //          '    <div class="time" data-time="' + timestamp + '">' +
  //                 Utils.getHourMinute(message.timestamp) +
  //          '    </div>' +
  //          '    <div class="text">' + body + '</div>' +
  //          '  </div>' +
  //          '</div>';
  // },
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
  close: function thui_close() {
    if (!document.body.classList.contains('conversation') &&
        !window.location.hash)
      return false;

    window.location.hash = '';
    return true;
  },
  sendMessage: function thui_sendMessage() {
    alert('SEND MESSAGE');
  //   var num = this.num.value;
  //   var self = this;
  //   var text = document.getElementById('view-msg-text').value;

  //   if (num === '' || text === '')
  //     return;

  //   MessageManager.send(num, text, function onsent(msg) {
  //     if (!msg) {
  //       ThreadUI.input.value = text;
  //       ThreadUI.updateInputHeight();

  //       if (ThreadUI.filter) {
  //         if (window.location.hash !== '#num=' + ThreadUI.filter)
  //           window.location.hash = '#num=' + ThreadUI.filter;
  //         else
  //           ThreadUI.renderMessages(ThreadUI.filter);
  //       }
  //       ThreadListUI.renderThreads();
  //       return;
  //     }

  //     // Add a slight delay so that the database has time to write the
  //     // message in the background. Ideally we'd just be updating the UI
  //     // from "sending..." to "sent" at this point...
  //     window.setTimeout(function() {
  //       if (ThreadUI.filter) {
  //         if (window.location.hash !== '#num=' + ThreadUI.filter)
  //           window.location.hash = '#num=' + ThreadUI.filter;
  //         else
  //           ThreadUI.renderMessages(ThreadUI.filter);
  //       }
  //       ThreadListUI.renderThreads();
  //     }, 100);
  //   });

  //   // Create a preliminary message object and update the view right away.
  //   var message = {
  //     sender: null,
  //     receiver: num,
  //     delivery: 'sending',
  //     body: text,
  //     timestamp: new Date()
  //   };

  //   window.setTimeout((function updateMessageField() {
  //     this.input.value = '';
  //     this.updateInputHeight();
  //     this.input.focus();

  //     if (this.filter) {
  //       this.renderMessages(this.filter, message);
  //       return;
  //     }
  //     this.renderMessages(num, message);
  //   }).bind(this), 0);

  //   ThreadListUI.renderThreads(message);

  }
};

window.addEventListener('localized', function showBody() {
  MessageManager.init();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});

// window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
//   var number = activity.source.data.number;
//   var displayThread = function actHandleDisplay() {
//     if (number)
//       window.location.hash = '#num=' + number;
//   }

//   if (document.readyState == 'complete') {
//     displayThread();
//   } else {
//     window.addEventListener('localized', function loadWait() {
//       window.removeEventListener('localized', loadWait);
//       displayThread();
//     });
//   }

//   activity.postResult({ status: 'accepted' });
// });

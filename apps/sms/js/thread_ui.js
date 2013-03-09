/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ThreadUI = {
  // Time buffer for the 'last-messages' set. In this case 10 min
  LAST_MESSSAGES_BUFFERING_TIME: 10 * 60 * 1000,
  CHUNK_SIZE: 10,
  get view() {
    delete this.view;
    return this.view = document.getElementById('messages-container');
  },

  get contactInput() {
    delete this.contactInput;
    return this.contactInput = document.getElementById('receiver-input');
  },

  get backButton() {
    delete this.backButton;
    return this.backButton = document.getElementById('go-to-threadlist');
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

  get cancelButton() {
    delete this.cancelButton;
    return this.cancelButton =
                              document.getElementById('messages-cancel-button');
  },

  get pageHeader() {
    delete this.pageHeader;
    return this.pageHeader = document.getElementById('messages-edit-title');
  },

  get editForm() {
    delete this.editForm;
    return this.editForm = document.getElementById('messages-edit-form');
  },

  get telForm() {
    delete this.telForm;
    return this.telForm = document.getElementById('messages-tel-form');
  },

  get sendForm() {
    delete this.sendForm;
    return this.sendForm = document.getElementById('new-sms-form');
  },

  init: function thui_init() {
    this.sendButton.addEventListener('click', this.sendMessage.bind(this));
    // Allow for stubbing in environments that do not implement the
    // `navigator.mozSms` API
    this._mozSms = navigator.mozSms || window.MockNavigatormozSms;

    // Prevent sendbutton to hide the keyboard:
    this.sendButton.addEventListener('mousedown',
      function btnDown(event) {
        event.preventDefault();
        event.target.classList.add('active');
      }
    );
    this.sendButton.addEventListener('mouseup',
      function btnUp(event) {
        event.target.classList.remove('active');
      }
    );
    this.sendButton.addEventListener('mouseout',
      function mouseOut(event) {
        event.target.classList.remove('active');
      }
    );
    this.backButton.addEventListener('click',
      this.onBackAction.bind(this));
    this.pickButton.addEventListener('click', this.pickContact.bind(this));
    this.selectAllButton.addEventListener('click',
      this.selectAllMessages.bind(this));
    this.deselectAllButton.addEventListener('click',
      this.deselectAllMessages.bind(this));
    this.cancelButton.addEventListener('click', this.cancelEditMode.bind(this));
    this.input.addEventListener('input', this.updateInputHeight.bind(this));
    this.input.addEventListener('input', this.enableSend.bind(this));
    this.contactInput.addEventListener('input', this.searchContact.bind(this));
    this.contactInput.addEventListener('input', this.enableSend.bind(this));
    this.deleteButton.addEventListener('click',
                                       this.executeDeletion.bind(this));
    this.title.addEventListener('click', this.activateContact.bind(this));
    this.clearButton.addEventListener('click', this.clearContact.bind(this));
    this.view.addEventListener('click', this);
    this.editForm.addEventListener('submit', this);
    this.telForm.addEventListener('submit', this);
    this.sendForm.addEventListener('submit', this);

    Utils.startTimeHeaderScheduler();

    // Initialized here, but used in ThreadUI.cleanFields
    this.previousHash = null;

    // We add the infinite scroll effect for increasing performance
    this.view.addEventListener('scroll', this.manageScroll.bind(this));
  },
  initSentAudio: function() {
    if (this.sentAudio)
      return;

    this.sentAudioKey = 'message.sent-sound.enabled';
    this.sentAudio = new Audio('/sounds/sent.ogg');
    this.sentAudio.mozAudioChannelType = 'notification';
    this.sentAudioEnabled = false;

    // navigator.mozSettings will always be defined, but in some environments,
    // it may be set to `null`.
    if (navigator.mozSettings !== null) {
      var req = navigator.mozSettings.createLock().get(this.sentAudioKey);
      req.onsuccess = (function onsuccess() {
        this.sentAudioEnabled = req.result[this.sentAudioKey];
      }).bind(this);

      navigator.mozSettings.addObserver(this.sentAudioKey, (function(e) {
        this.sentAudioEnabled = e.settingValue;
      }).bind(this));
    }
  },
  // We define an edge for showing the following chunk of elements
  manageScroll: function thui_manageScroll(oEvent) {
    // kEdge will be the limit (in pixels) for showing the next chunk
    var kEdge = 30;
    var currentScroll = this.view.scrollTop;
    if (currentScroll < kEdge) {
      var previous = this.view.scrollHeight;
      this.showChunkOfMessages(this.CHUNK_SIZE);
      // We update the scroll to the previous position
      // taking into account the previous offset to top
      // and the current height due to we have added a new
      // chunk of visible messages
      this.view.scrollTop =
        (this.view.scrollHeight - previous) + currentScroll;
    }
  },
  setInputMaxHeight: function thui_setInputMaxHeight() {
    // Method for initializing the maximum height
    var fontSize = Utils.getFontSize();
    var viewHeight = this.view.offsetHeight / fontSize;
    var inputHeight = this.input.offsetHeight / fontSize;
    var barHeight =
      document.getElementById('new-sms-form').offsetHeight / fontSize;
    var adjustment = barHeight - inputHeight;
    this.input.style.maxHeight = (viewHeight - adjustment) + 'rem';
  },
  onBackAction: function thui_onBackAction() {
    var goBack = function() {
      ThreadUI.stopRendering();
      if (ThreadUI.input.value.length == 0) {
        window.location.hash = '#thread-list';
        return;
      }
      var response = window.confirm(_('discard-sms'));
      if (response) {
        ThreadUI.cleanFields(true);
        window.location.hash = '#thread-list';
      }
    };

    // We're waiting for the keyboard to disappear before animating back
    if (MessageManager.fullHeight !== this.view.offsetHeight) {
      window.addEventListener('resize', function keyboardHidden() {
        window.removeEventListener('resize', keyboardHidden);
        goBack();
      });
    } else {
      goBack();
    }
  },

  enableSend: function thui_enableSend() {
    this.initSentAudio();
    if (this.input.value.length > 0) {
      this.updateCounter();
    }
    if (window.location.hash == '#new' && this.contactInput.value.length == 0) {
      this.sendButton.disabled = true;
      return;
    }

    this.sendButton.disabled = !(this.input.value.length > 0);
  },

  scrollViewToBottom: function thui_scrollViewToBottom() {
    this.view.scrollTop = this.view.scrollHeight;
  },

  updateCounter: function thui_updateCount(evt) {
    if (!navigator.mozSms) {
      return;
    }
    var value = this.input.value;
    // We set maximum concatenated number of our SMS app to 10 based on:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=813686#c0
    var kMaxConcatenatedMessages = 10;

    // Use backend api for precise sms segmetation information.
    var smsInfo = this._mozSms.getSegmentInfoForText(value);
    var segments = smsInfo.segments;
    var availableChars = smsInfo.charsAvailableInLastSegment;
    var counter = '';
    if (segments > 1 || availableChars <= 10) {
      counter = availableChars + '/' + segments;
    }
    this.sendButton.dataset.counter = counter;
    this.sendButton.disabled = (segments > kMaxConcatenatedMessages);
  },

  updateInputHeight: function thui_updateInputHeight() {
    // First of all we retrieve all CSS info which we need
    var inputCss = window.getComputedStyle(this.input, null);
    var inputMaxHeight = parseInt(inputCss.getPropertyValue('max-height'), 10);
    var fontSize = Utils.getFontSize();
    var verticalPadding =
      (parseInt(inputCss.getPropertyValue('padding-top'), 10) +
      parseInt(inputCss.getPropertyValue('padding-bottom'), 10)) /
      fontSize;
    var buttonHeight = 30;

    // Retrieve elements useful in growing method
    var bottomBar = document.getElementById('new-sms-form');

    // Updating the height if scroll is bigger that height
    // This is when we have reached the header (UX requirement)
    if (this.input.scrollHeight > inputMaxHeight) {
      // Height of the input is the maximum
      this.input.style.height = inputMaxHeight / fontSize + 'rem';
      // Update the bottom bar height taking into account the padding
      bottomBar.style.height =
        inputMaxHeight / fontSize + verticalPadding + 'rem';
      // We update the position of the button taking into account the
      // new height
      this.sendButton.style.marginTop =
        (this.input.offsetHeight - buttonHeight) / fontSize + 'rem';
      return;
    }

    // In a regular scenario, we need to grow the input step by step
    this.input.style.height = null;
    // If the scroll height is smaller than original offset height, we keep
    // offset height to keep original height, otherwise we use scroll height
    // with additional margin for preventing scroll bar.
    this.input.style.height =
      this.input.offsetHeight > this.input.scrollHeight ?
      this.input.offsetHeight / fontSize + 'rem' :
      this.input.scrollHeight / fontSize + verticalPadding + 'rem';

    // We retrieve current height of the input
    var newHeight = this.input.getBoundingClientRect().height;

    // We calculate the height of the bottonBar which contains the input
    var bottomBarHeight = (newHeight / fontSize + verticalPadding) + 'rem';
    bottomBar.style.height = bottomBarHeight;

    // We move the button to the right position
    var buttonOffset = (this.input.offsetHeight - buttonHeight) /
      fontSize + 'rem';
    this.sendButton.style.marginTop = buttonOffset;

    // Last adjustment to view taking into account the new height of the bar
    this.view.style.bottom = bottomBarHeight;
    this.scrollViewToBottom();
  },
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  getMessageContainer:
    function thui_getMessageContainer(messageTimestamp, hidden) {
    var normalizedTimestamp = Utils.getDayDate(messageTimestamp);
    var referenceTime = Date.now();
    var messageContainer;
    // If timestamp belongs to [referenceTime, referenceTime - TimeBuffer]
    var isLastMessagesBlock =
    (messageTimestamp >= (referenceTime - this.LAST_MESSSAGES_BUFFERING_TIME));
    // Is there any container with our requirements?
    if (isLastMessagesBlock) {
      messageContainer = document.getElementById('last-messages');
    } else {
      messageContainer = document.getElementById('mc_' + normalizedTimestamp);
    }

    if (messageContainer) {
      return messageContainer;
    }
    // If there is no messageContainer we have to create it
    // Create DOM Element for header
    var header = document.createElement('header');
    // Append 'time-update' state
    header.dataset.timeUpdate = true;
    header.dataset.time = messageTimestamp;
    if (hidden) {
      header.classList.add('hidden');
    }
    // Add text
    var content;
    if (!isLastMessagesBlock) {
      content = Utils.getHeaderDate(messageTimestamp) + ' ' +
                Utils.getFormattedHour(messageTimestamp);
    } else {
      content = Utils.getFormattedHour(messageTimestamp);
      header.dataset.hourOnly = 'true';
    }
    header.innerHTML = content;
    // Create list element for ul
    messageContainer = document.createElement('ul');
    if (!isLastMessagesBlock) {
      messageContainer.id = 'mc_' + normalizedTimestamp;
    } else {
      messageContainer.id = 'last-messages';
    }
    messageContainer.dataset.timestamp = normalizedTimestamp;
    // Where do I have to append the Container?
    // If is the first block or is the 'last-messages' one should be the
    // most recent one.
    if (isLastMessagesBlock || !ThreadUI.view.firstElementChild) {
      ThreadUI.view.appendChild(header);
      ThreadUI.view.appendChild(messageContainer);
      return messageContainer;
    }
    // In other case we have to look for the right place for appending
    // the message
    var messageContainers = ThreadUI.view.getElementsByTagName('ul');
    var insertBeforeContainer;
    for (var i = 0, l = messageContainers.length; i < l; i++) {
      if (normalizedTimestamp < messageContainers[i].dataset.timestamp) {
        insertBeforeContainer = messageContainers[i];
        break;
      }
    }
    // If is undefined we try witn the 'last-messages' block
    if (!insertBeforeContainer) {
      insertBeforeContainer = document.getElementById('last-messages');
    }
    // Finally we append the container & header in the right position
    if (insertBeforeContainer) {
      ThreadUI.view.insertBefore(messageContainer,
        insertBeforeContainer.previousSibling);
      ThreadUI.view.insertBefore(header, messageContainer);
    } else {
      ThreadUI.view.appendChild(header);
      ThreadUI.view.appendChild(messageContainer);
    }
    return messageContainer;
  },
  // Method for updating the header with the info retrieved from Contacts API
  updateHeaderData: function thui_updateHeaderData(callback) {
    // For Desktop Testing, mozContacts it's mockuped but it's not working
    // completely. So in the case of Desktop testing we are going to execute
    // the callback directly in order to make it works!
    // https://bugzilla.mozilla.org/show_bug.cgi?id=836733
    if (!navigator.mozSms && callback) {
      setTimeout(callback);
      return;
    }

    var number = MessageManager.currentNum;
    if (!number) {
      return;
    }

    var self = this;
    // Add data to contact activity interaction
    this.title.dataset.phoneNumber = number;

    ContactDataManager.getContactData(number, function gotContact(contacts) {
      var carrierTag = document.getElementById('contact-carrier');
      /** If we have more than one contact sharing the same phone number
       *  we show the name of the first contact and how many other contacts
       *  share that same number. We thing it's user's responsability to correct
       *  this mess with the agenda.
       */
      if (contacts.length > 1) {
        self.title.dataset.isContact = true;
        var contactName = contacts[0].name[0];
        var numOthers = contacts.length - 1;
        self.title.textContent = _('others', {
          name: contactName,
          n: numOthers
        });
        carrierTag.classList.add('hide');
      } else {
        Utils.getPhoneDetails(number,
                              contacts[0],
                              function returnedDetails(details) {
          if (details.isContact) {
            self.title.dataset.isContact = true;
          } else {
            delete self.title.dataset.isContact;
          }
          self.title.textContent = details.title || number;
          if (details.carrier) {
            carrierTag.textContent = details.carrier;
            carrierTag.classList.remove('hide');
          } else {
            carrierTag.classList.add('hide');
          }
        });
      }

      if (callback) {
        callback();
      }
    });
  },

  initializeRendering: function thui_initializeRendering(messages, callback) {
    // Clean fields
    this.cleanFields();
    this.checkInputs();
    // Clean list of messages
    this.view.innerHTML = '';
    // Update header index
    this.dayHeaderIndex = 0;
    this.timeHeaderIndex = 0;
    // Init readMessages array
    this.readMessages = [];
    // Initialize infinite scroll params
    this.messageIndex = 0;
    // reset stopRendering boolean
    this._stopRenderingNextStep = false;
  },
  // Method for stopping the rendering when clicking back
  stopRendering: function thui_stopRendering() {
    this._stopRenderingNextStep = true;
  },
  // Method for rendering the first chunk at the beginning
  showFirstChunk: function thui_showFirstChunk() {
    // Show chunk of messages
    ThreadUI.showChunkOfMessages(this.CHUNK_SIZE);
    // Boot update of headers
    Utils.updateTimeHeaders();
    // Go to Bottom
    ThreadUI.scrollViewToBottom();
  },
  // Method for rendering the list of messages using infinite scroll
  renderMessages: function thui_renderMessages(filter, callback) {
    // We initialize all params before rendering
    this.initializeRendering();
    // We call getMessages with callbacks
    var self = this;
    var onMessagesRendered = function messagesRendered() {
      if (self.messageIndex < self.CHUNK_SIZE) {
        self.showFirstChunk();
      }
      // Update STATUS of messages if needed
      filter.read = false;
      if (callback) {
        callback();
      }
      setTimeout(function updatingStatus() {
        var messagesUnreadIDs = [];
        var changeStatusOptions = {
          stepCB: function addUnreadMessage(message) {
            messagesUnreadIDs.push(message.id);
          },
          filter: filter,
          invert: true,
          endCB: function handleUnread() {
            MessageManager.markMessagesRead(messagesUnreadIDs, true);
          }
        };
        MessageManager.getMessages(changeStatusOptions);
      });
    };
    var renderingOptions = {
      stepCB: function renderMessage(message) {
        if (self._stopRenderingNextStep) {
          // stop the iteration
          return false;
        }
        self.appendMessage(message,/*hidden*/ true);
        self.messageIndex++;
        if (self.messageIndex === self.CHUNK_SIZE) {
          self.showFirstChunk();
        }
        return true;
      },
      filter: filter,
      invert: false,
      endCB: onMessagesRendered
    };
    MessageManager.getMessages(renderingOptions);
  },

  appendMessage: function thui_appendMessage(message, hidden) {
    // Retrieve all data from message
    var id = message.id;
    var bodyText = message.body;
    var bodyHTML = Utils.escapeHTML(bodyText);
    var timestamp = message.timestamp.getTime();
    var messageClass = message.delivery;

    var messageDOM = document.createElement('li');
    messageDOM.classList.add('bubble');
    messageDOM.dataset.timestamp = timestamp;

    if (hidden) {
      messageDOM.classList.add('hidden');
    }
    messageDOM.id = 'message-' + id;
    var inputValue = id;
    var asideHTML = '';
    // Do we have to add some error/sending icon?
    switch (message.delivery) {
      case 'error':
        asideHTML = '<aside class="pack-end"></aside>';
        ThreadUI.addResendHandler(message, messageDOM);
        break;
      case 'sending':
        asideHTML = '<aside class="pack-end">' +
                    '<progress></progress></aside>';
        break;
    }

    // Create HTML content
    var messageHTML = '<label class="danger">' +
                      '<input type="checkbox" value="' + inputValue + '">' +
                      '<span></span>' +
                      '</label>' +
                    '<a class="' + messageClass + '">';
    messageHTML += asideHTML;
    messageHTML += '<p>' + bodyHTML + '</p></a>';
    messageDOM.innerHTML = messageHTML;
    // Add to the right position
    var messageContainer = ThreadUI.getMessageContainer(timestamp, hidden);
    if (!messageContainer.firstElementChild) {
      messageContainer.appendChild(messageDOM);
    } else {
      var messages = messageContainer.children;
      var appended = false;
      for (var i = 0, l = messages.length; i < l; i++) {
        if (timestamp < messages[i].dataset.timestamp) {
          messageContainer.insertBefore(messageDOM, messages[i]);
          appended = true;
          break;
        }
      }
      if (!appended) {
        messageContainer.appendChild(messageDOM);
      }
    }
  },

  showChunkOfMessages: function thui_showChunkOfMessages(number) {
    var hiddenElements = ThreadUI.view.getElementsByClassName('hidden');
    for (var i = hiddenElements.length - 1; i >= 0; i--) {
      hiddenElements[i].classList.remove('hidden');
    }
  },

  addResendHandler: function thui_addResendHandler(message, messageDOM) {
    messageDOM.addEventListener('click', function resend(e) {
      var hash = window.location.hash;
      if (hash != '#edit') {
        var resendConfirmStr = _('resend-confirmation');
        var result = confirm(resendConfirmStr);
        if (result) {
          messageDOM.removeEventListener('click', resend);
          ThreadUI.resendMessage(message, messageDOM);
        }
      }
    });
  },

  cleanForm: function thui_cleanForm() {
    // Reset all inputs
    var inputs = this.view.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    // Reset vars for deleting methods
    this.checkInputs();
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
      ThreadUI.chooseMessage(inputs[i]);
    }
    ThreadUI.checkInputs();
  },

  deselectAllMessages: function thui_deselectAllMessages() {
    var inputs =
            this.view.querySelectorAll('input[type="checkbox"]:checked');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      ThreadUI.chooseMessage(inputs[i]);
    }
    ThreadUI.checkInputs();
  },

  executeDeletion: function thui_executeDeletion() {
    var response = window.confirm(_('deleteMessages-confirmation'));
    if (response) {
      WaitingScreen.show();
      var delNumList = [];
      var inputs =
        ThreadUI.view.querySelectorAll('input[type="checkbox"]:checked');
      for (var i = 0; i < inputs.length; i++) {
        delNumList.push(parseInt(inputs[i].value, 10));
      }

      // Method for deleting all inputs selected
      var deleteMessages = function() {
        MessageManager.getThreads(ThreadListUI.renderThreads,
        function afterRender() {
          var completeDeletionDone = false;
          // Then sending/received messages
          for (var i = 0; i < inputs.length; i++) {
            var message = inputs[i].parentNode.parentNode;
            var messagesContainer = message.parentNode;
            // Is the last message in the container?
            if (messagesContainer.childNodes.length == 1) {
              var header = messagesContainer.previousSibling;
              ThreadUI.view.removeChild(header);
              ThreadUI.view.removeChild(messagesContainer);
              if (!ThreadUI.view.childNodes.length) {
                var mainWrapper = document.getElementById('main-wrapper');
                mainWrapper.classList.remove('edit');
                window.location.hash = '#thread-list';
                WaitingScreen.hide();
                completeDeletionDone = true;
                break;
              }
            } else {
              messagesContainer.removeChild(message);
            }
          }
          if (!completeDeletionDone) {
            window.history.back();
            WaitingScreen.hide();
          }
        });
      };

      MessageManager.deleteMessages(delNumList, deleteMessages);
    }
  },

  cancelEditMode: function thlui_cancelEditMode() {
    window.history.go(-1);
  },

  chooseMessage: function thui_chooseMessage(target) {
    if (!target.checked) {
      // Removing red bubble
      target.parentNode.parentNode.classList.remove('selected');
    } else {
      // Adding red bubble
      target.parentNode.parentNode.classList.add('selected');
    }
  },

  checkInputs: function thui_checkInputs() {
    var selected = this.view.querySelectorAll('input[type="checkbox"]:checked');
    var allInputs = this.view.querySelectorAll('input[type="checkbox"]');

    if (selected.length == allInputs.length) {
      ThreadUI.selectAllButton.classList.add('disabled');
    } else {
      ThreadUI.selectAllButton.classList.remove('disabled');
    }
    if (selected.length > 0) {
      ThreadUI.deselectAllButton.classList.remove('disabled');
      ThreadUI.deleteButton.classList.remove('disabled');
      this.pageHeader.innerHTML = _('selected', {n: selected.length});
    } else {
      ThreadUI.deselectAllButton.classList.add('disabled');
      ThreadUI.deleteButton.classList.add('disabled');
      this.pageHeader.innerHTML = _('editMode');
    }
  },

  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (window.location.hash != '#edit') {
          return;
        }
        var inputs = evt.target.parentNode.getElementsByTagName('input');
        if (inputs && inputs.length > 0) {
          ThreadUI.chooseMessage(inputs[0]);
          ThreadUI.checkInputs();
        }
        break;
      case 'submit':
        evt.preventDefault();
        break;
    }
  },

  cleanFields: function thui_cleanFields(forceClean) {
    var self = this;
    var clean = function clean() {
      self.input.value = '';
      self.sendButton.disabled = true;
      self.sendButton.dataset.counter = '';
      self.contactInput.value = '';
      self.updateInputHeight();
    };

    if (this.previousHash === window.location.hash ||
        this.previousHash === '#new') {
      if (forceClean) {
        clean();
      }
    } else {
      clean();
    }
    this.enableSend();
    this.previousHash = window.location.hash;
  },

  sendMessage: function thui_sendMessage(resendText) {
    var num, text;

    if (resendText && (typeof(resendText) === 'string') && resendText !== '') {
      num = MessageManager.currentNum;
      text = resendText;
    } else {
      // Retrieve num depending on hash
      var hash = window.location.hash;
      // Depending where we are, we get different num
      if (hash == '#new') {
        num = this.contactInput.value;
        if (!num) {
          return;
        }
      } else {
        num = MessageManager.currentNum;
      }

      // Retrieve text
      text = this.input.value;
      if (!text) {
        return;
      }
    }
    // Clean fields (this lock any repeated click in 'send' button)
    this.cleanFields(true);
    // Remove when
    // https://bugzilla.mozilla.org/show_bug.cgi?id=825604 landed
    MessageManager.currentNum = num;
    this.updateHeaderData();
    // Send the SMS
    MessageManager.send(num, text);
  },

  onMessageSent: function thui_onMessageSent(message) {
    var messageDOM = document.getElementById('message-' + message.id);
    if (!messageDOM) {
      return;
    }
    // Remove 'sending' style
    var aElement = messageDOM.querySelector('a');
    aElement.classList.remove('sending');
    // Remove the 'spinner'
    var spinnerContainer = aElement.querySelector('aside');
    aElement.removeChild(spinnerContainer);

    // Play the audio notification
    if (this.sentAudioEnabled) {
      this.sentAudio.play();
    }
  },

  onMessageFailed: function thui_onMessageFailed(message) {
    var messageDOM = document.getElementById('message-' + message.id);
    if (!messageDOM) {
      return;
    }
    // Remove 'sending' style and add 'error' style
    var aElement = messageDOM.querySelector('a');
    // Check if it was painted as 'error' before
    if (!aElement.classList.contains('sending')) {
      return;
    }
    aElement.classList.remove('sending');
    aElement.classList.add('error');

    // Remove only the spinner
    var spinnerContainer = aElement.querySelector('aside');
    spinnerContainer.innerHTML = '';

    ThreadUI.addResendHandler(message, messageDOM);

    this.ifRilDisabled(this.showAirplaneModeError);
  },

  ifRilDisabled: function thui_ifRilDisabled(func) {
    var settings = window.navigator.mozSettings;

    if (settings) {
      // Check if RIL is enabled or not
      var req = settings.createLock().get('ril.radio.disabled');
      req.addEventListener('success', function onsuccess() {
        var rilDisabled = req.result['ril.radio.disabled'];
        rilDisabled && func();
      });
    }
  },

  showAirplaneModeError: function thui_showAirplaneModeError() {
    CustomDialog.show(
      _('sendAirplaneModeTitle'),
      _('sendAirplaneModeBody'),
      {
        title: _('sendAirplaneModeBtnOk'),
        callback: function() {
          CustomDialog.hide();
        }
      }
    );
  },

  resendMessage: function thui_resendMessage(message, messageDOM) {
    // Is the last one in the ul?
    var messagesContainer = messageDOM.parentNode;
    if (messagesContainer.childNodes.length == 1) {
      // If it is, we remove header & container
      var header = messagesContainer.previousSibling;
      ThreadUI.view.removeChild(header);
      ThreadUI.view.removeChild(messagesContainer);
    } else {
      // If not we only have to remove the message
      messageDOM.parentNode.removeChild(messageDOM);
    }

    // Have we more elements in the view?
    if (!ThreadUI.view.childNodes.length) {
      // Update header index
      ThreadUI.dayHeaderIndex = 0;
      ThreadUI.timeHeaderIndex = 0;
    }

    // delete from Gecko db as well
    if (message.id) {
      MessageManager.deleteMessage(message.id);
    }

    // We resend again
    ThreadUI.sendMessage(message.body);
  },

  renderContactData: function thui_renderContactData(contact) {
    // Retrieve info from thread
    var self = this;
    var tels = contact.tel;
    var contactsContainer = document.createElement('ul');
    contactsContainer.classList.add('contactList');
    for (var i = 0; i < tels.length; i++) {
      Utils.getPhoneDetails(tels[i].value,
                            contact,
                            function gotDetails(details) {
        var name = Utils.escapeHTML((contact.name[0] || details.title));
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
        var contactDOM = document.createElement('li');

        // Do we have to update with photo?
        if (contact.photo && contact.photo[0]) {
          var photoURL = URL.createObjectURL(contact.photo[0]);
        }

        // Create HTML structure
        var structureHTML =
                '  <a href="#num=' + number + '">' +
                '<aside class="pack-end">' +
                  '<img ' + (photoURL ? 'src="' + photoURL + '"' : '') + '>' +
                '</aside>' +
                '    <p class="name">' + nameHTML + '</div>' +
                '    <p>' +
                      tels[i].type +
                      ' ' + numHTML +
                      ' ' + (tels[i].carrier ? tels[i].carrier : '') +
                '    </p>' +
                '  </a>';
        // Update HTML and append
        contactDOM.innerHTML = structureHTML;

        contactsContainer.appendChild(contactDOM);
      });
    }

    ThreadUI.view.appendChild(contactsContainer);
  },

  searchContact: function thui_searchContact() {
    var input = this.contactInput;
    var string = input.value;
    var self = this;
    self.view.innerHTML = '';
    if (!string) {
      return;
    }
    var contactsContainer = document.createElement('ul');

    ContactDataManager.searchContactData(string, function gotContact(contacts) {
      self.view.innerHTML = '';
      if (!contacts || contacts.length == 0) {



        var contactDOM = document.createElement('li');
        var noResultHTML = '<a><p data-l10n-id="no-results">' +
                           _('no-results') +
                           '</p></a>';
        contactDOM.innerHTML = noResultHTML;
        contactsContainer.appendChild(contactDOM);
        self.view.appendChild(contactsContainer);
        return;
      }
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
        if (number) {
          window.location.hash = '#num=' + number;
        }
      };
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
      activity.onsuccess = ThreadUI.onCreateContact;
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },
  onCreateContact: function thui_onCreateContact() {
    ThreadListUI.updateContactsInfo();
    // Update Header if needed
    if (window.location.hash.substr(0, 5) === '#num=') {
      ThreadUI.updateHeaderData();
    }
  }
};

window.addEventListener('resize', function resize() {
  ThreadUI.setInputMaxHeight();
  // Scroll to bottom
  ThreadUI.scrollViewToBottom();
});

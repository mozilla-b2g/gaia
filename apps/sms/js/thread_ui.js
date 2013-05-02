/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(global) {
'use strict';

var attachmentMap = new WeakMap();

function thui_mmsAttachmentClick(target) {
  var attachment = attachmentMap.get(target);
  if (!attachment) {
    return;
  }
  var activity = new MozActivity({
    name: 'open',
    data: {
      type: attachment.blob.type,
      filename: attachment.name,
      blob: attachment.blob
    }
  });
  activity.onerror = function() {
    console.warn('error with open activity', this.error.name);
    // TODO: Add an alert here with a string saying something like
    // "There is no application available to open this file type"
  };
}

var ThreadUI = global.ThreadUI = {
  // Time buffer for the 'last-messages' set. In this case 10 min
  LAST_MESSSAGES_BUFFERING_TIME: 10 * 60 * 1000,
  CHUNK_SIZE: 10,
  TO_FIELD_HEIGHT: 5.7,
  recipients: [],
  init: function thui_init() {
    var _ = navigator.mozL10n.get;
    // Fields with 'messages' label
    [
      'container',
      'recipients-container', 'live-search-results',
      'header-text', 'recipient', 'input', 'compose-form',
      'check-all-button', 'uncheck-all-button',
      'contact-pick-button', 'back-button', 'send-button',
      'delete-button', 'cancel-button',
      'edit-mode', 'edit-form', 'tel-form'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('messages-' + id);
    }, this);

    // Allow for stubbing in environments that do not implement the
    // `navigator.mozMobileMessage` API
    this._mozMobileMessage = navigator.mozMobileMessage ||
                              window.DesktopMockNavigatormozMobileMessage;

    this.recipientsContainer.addEventListener(
      'click', this.recipientsContainerClickHandler.bind(this)
    );

    this.liveSearchResults.addEventListener(
      'click', this.liveSearchResultsHandler.bind(this));

    this.recipientsContainer.addEventListener(
      'input', this.recipientsContainerInputHandler.bind(this), true);

    // Handlers for send button and avoiding to hide keyboard instead
    this.sendButton.addEventListener(
      'mousedown', function mouseDown(event) {
        event.preventDefault();
        event.target.classList.add('active');
      }
    );

    this.sendButton.addEventListener(
      'mouseup', function mouseUp(event) {
        event.target.classList.remove('active');
      }
    );

    this.sendButton.addEventListener(
      'mouseout', function mouseOut(event) {
        event.target.classList.remove('active');
      }
    );

    this.sendButton.addEventListener(
      'click', this.sendMessage.bind(this)
    );

    this.container.addEventListener(
      'scroll', this.manageScroll.bind(this)
    );

    this.backButton.addEventListener(
      'click', this.back.bind(this)
    );

    this.checkAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this, true)
    );

    this.uncheckAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this, false)
    );

    this.cancelButton.addEventListener(
      'click', this.cancelEdit.bind(this)
    );

    this.deleteButton.addEventListener(
      'click', this.delete.bind(this)
    );

    this.headerText.addEventListener(
      'click', this.activateContact.bind(this)
    );
    // When 'focus' we have to remove 'edit-mode' in the recipient
    this.input.addEventListener(
      'focus', this.messageComposerFocusHandler.bind(this)
    );
    // In case of input, we have to resize the input following UX Specs.
    this.input.addEventListener(
      'input', this.messageComposerInputHandler.bind(this)
    );

    // Delegate to |this.handleEvent|
    this.container.addEventListener(
      'click', this
    );
    this.container.addEventListener(
      'contextmenu', this
    );
    this.editForm.addEventListener(
      'submit', this
    );
    this.composeForm.addEventListener(
      'submit', this
    );
    // For picking a contact from Contacts. It's mouse down for
    // avoiding weird effect of keyboard, as in 'send' button.
    this.contactPickButton.addEventListener(
      'mousedown', this.addRecipientFromContacts.bind(this)
    );

    this.tmpl = ['contact', 'highlight'].reduce(function(tmpls, name) {
      tmpls[name] = Utils.Template('messages-' + name + '-tmpl');
      return tmpls;
    }, {});

    Utils.startTimeHeaderScheduler();

    // Initialized here, but used in ThreadUI.cleanFields
    this.previousHash = null;
  },

  initSentAudio: function thui_initSentAudio() {
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

  // Method for setting the body of a SMS/MMS from activity
  setMessageBody: function thui_setMessageBody(value) {
    this.input.value = value;
  },

  liveSearchResultsHandler: function thui_liveSearchResultsHandler(e) {
    e.stopPropagation();
    e.preventDefault();
    var recipient =
        this.recipientsContainer.querySelector('span[contenteditable=true]');
    var phoneNumber = e.target.dataset.phoneNumber;
    var name = e.target.dataset.name;
    var contact = {
      'name': name,
      'number': phoneNumber
    };
    // We remove the editable item
    this.removeRecipient(recipient);
    // We append the new one after picking from the list
    var newRecipient = this.appendEditableRecipient(contact);
    this.createRecipient(newRecipient);
    this.liveSearchResults.textContent = '';
  },

  messageComposerInputHandler: function thui_messageInputHandler(event) {
    this.updateInputHeight();
    this.enableSend();
  },

  messageComposerFocusHandler: function thui_messageInputHandler(event) {
    var recipient =
      this.recipientsContainer.querySelector('span[contenteditable=true]');
    // If the content of the recipient it's empty, we have to
    // remove from recipients container.
    if (!recipient) {
      return;
    }
    if (!recipient.textContent.trim()) {
      this.removeRecipient(recipient);
    } else {
      // TODO Modify this in multirecipient, due to we could add more than
      // one recipient. This is *only* for single recipient model.
      if (this.recipients.length === 0) {
        this.createRecipient(recipient);
      }
    }
  },

  recipientsContainerClickHandler: function thui_recipientHandler(event) {
    // If we tap on a recipient
    if (event.target.classList.contains('recipient')) {
      // We retrieve the recipient which dispatched the event
      var recipient = event.target;
      // Is a recipient-from-contact one?
      if (!recipient.dataset.isContact) {
        // If it's not, we could go to 'edit-mode'
        this.editRecipient(recipient);
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      // If its a contact, we have to show the option to remove
      // the contact.
      var confirmMessage =
        navigator.mozL10n.get('recipientRemoval',
          {recipient: recipient.textContent});
      // If it's a contact we should ask to remove
      if (confirm(confirmMessage)) {
        this.removeRecipient(recipient);
      }
    } else {
      // If we click/tap on the recipient container
      if (this.recipientsContainer.children.length === 0) {
        // TODO Modify in multirecipient. We could append more than one!
        this.appendEditableRecipient();
      } else {
        // TODO Remove this in multirecipient. For single recipient we are
        // going to focus in the last field added
        var editableRecipient =
          this.recipientsContainer.
            querySelector('span[contenteditable=true]');
        if (editableRecipient) {
          this.editRecipient(editableRecipient);
        }
      }
    }
  },

  recipientsContainerInputHandler: function thui_recipientHandler(event) {
    // Check if we are ready to create a recipient with the text typed.
    var recipient = event.target;
    var textTyped = recipient.textContent;
    // If while typing we find a ';' we have to create the recipient!
    if (textTyped.charAt(textTyped.length - 1) === ';') {
      this.createRecipient(recipient);
    } else {
      if (!recipient.textContent.trim()) {
        return;
      }
      // If it's not a ';' we are going to launch the live search
      this.searchContact(recipient.textContent);
    }
  },

  // Create a recipient from contacts activity.
  addRecipientFromContacts: function thui_addRecipientFromContacts() {
    var self = this;
    this.pick(function onsuccess(contact) {
        // TODO Remove in multirecipient because there is no
        // need to remove, only append
        self.cleanRecipients();
        // Create the box
        var recipient = self.appendEditableRecipient(contact);
        self.createRecipient(recipient);
      },function onerror() {
        console.log('ERROR Retrieving a contact from Contacts');
        // TODO Check if needed
      });
  },

  // Method for updating the header when needed
  updateComposerHeader: function thui_updateComposerHeader() {
    var recipientCount = this.recipients.length;
    if (recipientCount > 0) {
      this.contactPickButton.classList.add('disabled');
      this.headerText.textContent =
        navigator.mozL10n.get('recipient', {n: recipientCount});
    } else {
      this.contactPickButton.classList.remove('disabled');
      this.headerText.textContent = navigator.mozL10n.get('newMessage');
    }
    // Check if we need to enable send button.
    this.enableSend();
  },

  // Create a recipient box non-editable
  createRecipient: function thui_createRecipientBox(recipient) {
    // Remove ';' if needed
    recipient.textContent = recipient.textContent.replace(/;$/, '');
    if (recipient.textContent.length === 0) {
      this.removeRecipient(recipient);
      this.input.focus();
      return;
    }
    if (!recipient.dataset.isContact) {
      // Add dataset if needed
      recipient.dataset.phoneNumber = recipient.textContent;
    }
    // Remove edit-mode
    recipient.setAttribute('contenteditable', false);
    // Update recipients array
    this.recipients.push(recipient.dataset.phoneNumber);
    // Update the count in the header
    this.updateComposerHeader();
    // Move the focus to the input
    // TODO Remove in multirecipient, due to we could add more recipients.
    this.input.focus();
    // Cleaning live search panel
    this.container.textContent = '';
  },

  // Clean recipients container
  cleanRecipients: function thui_cleanRecipients() {
    this.recipients = [];
    this.recipientsContainer.textContent = '';
    this.liveSearchResults.textContent = '';
  },

  // Remove a recipient from the 'to-field'
  removeRecipient: function thui_removeRecipient(recipient) {
    // Remove from array
    var index = this.recipients.indexOf(recipient.dataset.phoneNumber);
    this.recipients.splice(index, 1);
    this.recipientsContainer.removeChild(recipient);
    this.updateComposerHeader();
  },

  // Set a recipient to editable if possible
  editRecipient: function thui_editRecipientBox(recipient) {
    if (recipient.dataset.phoneNumber) {
      var index = this.recipients.indexOf(recipient.dataset.phoneNumber);
      this.recipients.splice(index, 1);
      this.updateComposerHeader();
    }
    recipient.setAttribute('contenteditable', true);
    recipient.focus();
  },

  // Method which creates an editable recipient box
  appendEditableRecipient:
    function thui_appendEditableRecipient(contact) {
    // Create DOM Element
    var newRecipient = document.createElement('span');
    // Add styles
    newRecipient.classList.add('recipient');
    // Append to 'recipients-container'
    this.recipientsContainer.appendChild(newRecipient);
    // If it's a contact we need to add extra-info
    if (contact) {
      // Update the name and adding the right info
      newRecipient.textContent = contact.name;
      newRecipient.dataset.isContact = true;
      newRecipient.dataset.phoneNumber = contact.number;
    } else {
      // If it's not a contact it's an editable one
      this.editRecipient(newRecipient);
    }
    return newRecipient;
  },

  // We define an edge for showing the following chunk of elements
  manageScroll: function thui_manageScroll(oEvent) {
    // kEdge will be the limit (in pixels) for showing the next chunk
    var kEdge = 30;
    var currentScroll = this.container.scrollTop;
    if (currentScroll < kEdge) {
      var previous = this.container.scrollHeight;
      this.showChunkOfMessages(this.CHUNK_SIZE);
      // We update the scroll to the previous position
      // taking into account the previous offset to top
      // and the current height due to we have added a new
      // chunk of visible messages
      this.container.scrollTop =
        (this.container.scrollHeight - previous) + currentScroll;
    }
  },
  setInputMaxHeight: function thui_setInputMaxHeight() {
    // Method for initializing the maximum height
    var fontSize = Utils.getFontSize();
    var viewHeight = this.container.offsetHeight / fontSize;
    var inputHeight = this.input.offsetHeight / fontSize;
    var barHeight =
      document.getElementById('messages-compose-form').offsetHeight / fontSize;
    var adjustment = barHeight - inputHeight;
    if (window.location.hash === '#new') {
      adjustment += this.TO_FIELD_HEIGHT;
    }
    this.input.style.maxHeight = (viewHeight - adjustment) + 'rem';
  },
  back: function thui_back() {
    var goBack = (function() {
      this.stopRendering();
      if (!this.input.value.length) {
        window.location.hash = '#thread-list';
        return;
      }
      if (window.confirm(navigator.mozL10n.get('discard-sms'))) {
        this.cleanFields(true);
        window.location.hash = '#thread-list';
      }
    }).bind(this);

    // We're waiting for the keyboard to disappear before animating back
    if (this.isKeyboardDisplayed()) {

      window.addEventListener('resize', function keyboardHidden() {
        window.removeEventListener('resize', keyboardHidden);
        window.clearTimeout(setTimer);
        goBack();
      });
      var setTimer = window.setTimeout(goBack, 400);
    } else {
      goBack();
    }
  },

  isKeyboardDisplayed: function thui_isKeyboardDisplayed() {
    // minimal keyboard height is 150px
    return (this.container.offsetHeight < ThreadListUI.fullHeight - 150);
  },

  enableSend: function thui_enableSend() {
    this.initSentAudio();
    if (this.input.value.length) {
      this.updateCounter();
    }

    if (window.location.hash == '#new' && this.recipients.length === 0) {
      this.sendButton.disabled = true;
      return;
    }

    this.sendButton.disabled = !this.input.value.length;
  },

  scrollViewToBottom: function thui_scrollViewToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  },

  updateCounter: function thui_updateCount() {
    if (!this._mozMobileMessage.getSegmentInfoForText) {
      return;
    }
    var value = this.input.value;
    // We set maximum concatenated number of our SMS app to 10 based on:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=813686#c0
    var kMaxConcatenatedMessages = 10;

    // Use backend api for precise sms segmetation information.
    var smsInfo = this._mozMobileMessage.getSegmentInfoForText(value);
    var segments = smsInfo.segments;
    var availableChars = smsInfo.charsAvailableInLastSegment;
    var counter = '';
    if (segments > 1 || availableChars <= 10) {
      counter = availableChars + '/' + segments;
    }
    this.sendButton.dataset.counter = counter;
    var hasMaxLength = (segments === kMaxConcatenatedMessages &&
        !availableChars);

    // note: when we'll have the MMS feature, we'll want to use an MMS instead
    // of forbidding this.
    if (hasMaxLength) {
      // set maxlength before calling alert, to disable entering more characters
      this.input.setAttribute('maxlength', value.length);
      // this will make the keyboard disappear
      this.input.blur();

      var message = navigator.mozL10n.get('messages-max-length-notice');
      window.alert(message);
    } else {
      this.input.removeAttribute('maxlength');
    }
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
    var bottomBar = document.getElementById('messages-compose-form');

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
    this.container.style.bottom = bottomBarHeight;
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
    if (isLastMessagesBlock || !ThreadUI.container.firstElementChild) {
      ThreadUI.container.appendChild(header);
      ThreadUI.container.appendChild(messageContainer);
      return messageContainer;
    }
    // In other case we have to look for the right place for appending
    // the message
    var messageContainers = ThreadUI.container.getElementsByTagName('ul');
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
      ThreadUI.container.insertBefore(messageContainer,
        insertBeforeContainer.previousSibling);
      ThreadUI.container.insertBefore(header, messageContainer);
    } else {
      ThreadUI.container.appendChild(header);
      ThreadUI.container.appendChild(messageContainer);
    }
    return messageContainer;
  },
  // Method for updating the header with the info retrieved from Contacts API
  updateHeaderData: function thui_updateHeaderData(callback) {

    // For Desktop Testing, mozContacts it's mockuped but it's not working
    // completely. So in the case of Desktop testing we are going to execute
    // the callback directly in order to make it works!
    // https://bugzilla.mozilla.org/show_bug.cgi?id=836733
    if (!navigator.mozMobileMessage && callback) {
      this.headerText.textContent = MessageManager.currentNum;
      setTimeout(callback);
      return;
    }

    var number = MessageManager.currentNum;
    if (!number) {
      return;
    }

    // Add data to contact activity interaction
    this.headerText.dataset.phoneNumber = number;

    Contacts.findByPhoneNumber(number, function gotContact(contacts) {
      var carrierTag = document.getElementById('contact-carrier');
      /** If we have more than one contact sharing the same phone number
       *  we show the name of the first contact and how many other contacts
       *  share that same number. We thing it's user's responsability to correct
       *  this mess with the agenda.
       */
      if (contacts.length > 1) {
        this.headerText.dataset.isContact = true;
        var contactName = contacts[0].name[0];
        var numOthers = contacts.length - 1;
        this.headerText.textContent = navigator.mozL10n.get('others', {
          name: contactName,
          n: numOthers
        });
        carrierTag.classList.add('hide');
      } else {
        Utils.getPhoneDetails(number,
                              contacts[0],
                              function returnedDetails(details) {
          if (details.isContact) {
            this.headerText.dataset.isContact = true;
          } else {
            delete this.headerText.dataset.isContact;
          }
          this.headerText.textContent = details.title || number;
          if (details.carrier) {
            carrierTag.textContent = details.carrier;
            carrierTag.classList.remove('hide');
          } else {
            carrierTag.classList.add('hide');
          }
        }.bind(this));
      }

      if (callback) {
        callback();
      }
    }.bind(this));
  },

  initializeRendering: function thui_initializeRendering(messages, callback) {
    // Clean fields
    this.cleanFields();
    this.checkInputs();
    // Clean list of messages
    this.container.innerHTML = '';
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

  createMmsContent: function thui_createMmsContent(dataArray) {
    var container = document.createElement('div');
    container.classList.add('mms-container');
    dataArray.forEach(function(attachment) {
      var mediaElement, textElement;

      if (attachment.name && attachment.blob) {
        var type = Utils.typeFromMimeType(attachment.blob.type);
        if (type) {
          var url = URL.createObjectURL(attachment.blob);
          mediaElement = document.createElement(type);
          mediaElement.src = url;
          mediaElement.onload = function() {
            URL.revokeObjectURL(url);
          };
          container.appendChild(mediaElement);
        }
        attachmentMap.set(mediaElement, attachment);
        container.appendChild(mediaElement);
      }

      if (attachment.text) {
        textElement = document.createElement('span');

        // escape text for html and look for clickable numbers, etc.
        var text = Utils.escapeHTML(attachment.text);
        text = LinkHelper.searchAndLinkClickableData(text);

        textElement.innerHTML = text;
        container.appendChild(textElement);
      }
    });
    return container;
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
        if (MessageManager.currentThread === null) {
          MessageManager.currentThread = message.threadId;
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

  buildMessageDOM: function thui_buildMessageDOM(message, hidden) {
    // Retrieve all data from message
    var id = message.id;
    var bodyText = Utils.Message.format(message.body);
    var delivery = message.delivery;
    var messageDOM = document.createElement('li');

    messageDOM.classList.add('bubble');

    if (hidden) {
      messageDOM.classList.add('hidden');
    }
    messageDOM.id = 'message-' + id;
    var inputValue = id;
    var asideHTML = '';
    // Do we have to add some error/sending icon?
    if (delivery) {
      switch (delivery) {
        case 'error':
          asideHTML = '<aside class="pack-end"></aside>';
          break;
        case 'sending':
          asideHTML = '<aside class="pack-end">' +
                      '<progress></progress></aside>';
          break;
      }
    }
    // Create HTML content
    // TODO: use Utils.Template here
    var messageHTML = '<label class="danger">' +
                      '<input type="checkbox" value="' + inputValue + '">' +
                      '<span></span>' +
                      '</label>' +
                    '<a class="' + delivery + '">';
    messageHTML += asideHTML;
    messageHTML += '<p></p></a>';
    messageDOM.innerHTML = messageHTML;
    if (delivery === 'error') {
      ThreadUI.addResendHandler(message, messageDOM);
    }


    var pElement = messageDOM.querySelector('p');
    if (message.type && message.type === 'mms') { // MMS
      if (message.delivery === 'not-downloaded') {
        // TODO: We need to handle the mms message with "not-downloaded" status
      } else {
        pElement.classList.add('mms-bubble-content');
        SMIL.parse(message, function(slideArray) {
          pElement.appendChild(ThreadUI.createMmsContent(slideArray));
        });
      }
    } else { // SMS
      // TODO: make this work without setting innerHTML
      pElement.innerHTML = LinkHelper.searchAndLinkClickableData(bodyText);
    }
    return messageDOM;
  },

  appendMessage: function thui_appendMessage(message, hidden) {
    // build messageDOM adding the links
    var messageDOM = this.buildMessageDOM(message, hidden);
    var timestamp = message.timestamp.getTime();
    messageDOM.dataset.timestamp = timestamp;
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

    if (document.getElementById('main-wrapper').classList.contains('edit'))
      this.checkInputs();
  },

  showChunkOfMessages: function thui_showChunkOfMessages(number) {
    var elements = ThreadUI.container.getElementsByClassName('hidden');
    for (var i = elements.length - 1; i >= 0; i--) {
      elements[i].classList.remove('hidden');
    }
  },

  addResendHandler: function thui_addResendHandler(message, messageDOM) {
    var aElement = messageDOM.querySelector('aside');
    aElement.addEventListener('click', function resend(e) {
      var hash = window.location.hash;
      if (hash != '#edit') {
        if (window.confirm(navigator.mozL10n.get('resend-confirmation'))) {
          messageDOM.removeEventListener('click', resend);
          ThreadUI.resendMessage(message, messageDOM);
        }
      }
    });
  },

  cleanForm: function thui_cleanForm() {
    // Reset all inputs
    var inputs = this.container.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    // Reset vars for deleting methods
    this.checkInputs();
  },

  clear: function thui_clear() {
    this.recipient.value = '';
    this.container.innerHTML = '';
  },

  toggleCheckedAll: function thui_select(value) {
    var inputs = this.container.querySelectorAll(
      'input[type="checkbox"]' +
      // value ?
      //   true : query for currently unselected threads
      //   false: query for currently selected threads
      (value ? ':not(:checked)' : ':checked')
    );
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = value;
      this.chooseMessage(inputs[i]);
    }
    this.checkInputs();
  },

  delete: function thui_delete() {
    var question = navigator.mozL10n.get('deleteMessages-confirmation');
    if (window.confirm(question)) {
      WaitingScreen.show();
      var delNumList = [];
      var inputs = ThreadUI.container.querySelectorAll(
        'input[type="checkbox"]:checked'
      );
      for (var i = 0; i < inputs.length; i++) {
        delNumList.push(+inputs[i].value);
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
              ThreadUI.container.removeChild(header);
              ThreadUI.container.removeChild(messagesContainer);
              if (!ThreadUI.container.childNodes.length) {
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

  cancelEdit: function thlui_cancelEdit() {
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
    var _ = navigator.mozL10n.get;
    var selected = this.container.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    var allInputs = this.container.querySelectorAll(
      'input[type="checkbox"]'
    );
    if (selected.length == allInputs.length) {
      this.checkAllButton.disabled = true;
    } else {
      this.checkAllButton.disabled = false;
    }
    if (selected.length > 0) {
      this.uncheckAllButton.disabled = false;
      this.deleteButton.disabled = false;
      this.editMode.innerHTML = _('selected', {n: selected.length});
    } else {
      this.uncheckAllButton.disabled = true;
      this.deleteButton.disabled = true;
      this.editMode.innerHTML = _('editMode');
    }
  },

  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (window.location.hash !== '#edit') {
          // Handle events on links in a message
          thui_mmsAttachmentClick(evt.target);
          LinkActionHandler.handleTapEvent(evt);
          return;
        }

        var input = evt.target.parentNode.querySelector('input');
        if (input) {
          ThreadUI.chooseMessage(input);
          ThreadUI.checkInputs();
        }
        break;
      case 'contextmenu':
        LinkActionHandler.handleLongPressEvent(evt);
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
      self.updateInputHeight();
      if (window.location.hash === '#new') {
        self.cleanRecipients();
        self.updateComposerHeader();
      }

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

    this.container.classList.remove('hide');

    if (resendText && typeof resendText === 'string') {
      num = MessageManager.currentNum;
      text = resendText;
    } else {
      // Retrieve num depending on hash
      var hash = window.location.hash;
      // Depending where we are, we get different num
      if (hash == '#new') {
        // TODO Modify this in multirecipient, due to here we have
        // *only* one recipient.
        num = this.recipients[0];
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
    var _ = navigator.mozL10n.get;
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
      ThreadUI.container.removeChild(header);
      ThreadUI.container.removeChild(messagesContainer);
    } else {
      // If not we only have to remove the message
      messageDOM.parentNode.removeChild(messageDOM);
    }

    // Have we more elements in the view?
    if (!ThreadUI.container.childNodes.length) {
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


  // Returns true when a contact has been rendered
  // Returns false when no contact has been rendered
  renderContact: function thui_renderContact(contact, value) {
    // Contact records that don't have phone numbers
    // cannot be sent SMS or MMS messages
    // TODO: Add email checking support for MMS
    if (contact.tel === null) {
      return false;
    }

    var input = value.trim();
    var contactsUl = this.liveSearchResults;
    var escaped = Utils.escapeRegex(input);
    var escsubs = escaped.split(/\s+/);
    var tels = contact.tel;
    var name = contact.name[0];
    var regexps = {
      name: new RegExp('(\\b' + escsubs.join(')|(\\b') + ')', 'gi'),
      number: new RegExp(escaped, 'ig')
    };


    for (var i = 0; i < tels.length; i++) {
      var current = tels[i];
      var number = current.value;

      Utils.getPhoneDetails(number, contact, function(details) {
        var contactLi = document.createElement('li');
        var data = {
          name: Utils.escapeHTML(name || details.title),
          number: Utils.escapeHTML(number),
          type: current.type || '',
          carrier: current.carrier || '',
          srcAttr: details.photoURL ?
            'src="' + Utils.escapeHTML(details.photoURL) + '"' : '',
          nameHTML: '',
          numberHTML: ''
        };

        ['name', 'number'].forEach(function(key) {
          data[key + 'HTML'] = data[key].replace(
            regexps[key], function(match) {
              return this.tmpl.highlight.interpolate({
                str: match
              });
            }.bind(this)
          );
        }, this);

        // Interpolate HTML template with data and inject.
        // Known "safe" HTML values will not be re-sanitized.
        contactLi.innerHTML = this.tmpl.contact.interpolate(data, {
          safe: ['nameHTML', 'numberHTML', 'srcAttr']
        });
        contactsUl.appendChild(contactLi);

      }.bind(this));
    }
    return true;
  },

  searchContact: function thui_searchContact(filterValue) {

    if (!filterValue.trim()) {
      // In cases where searchContact was invoked for "input"
      // that was actually a "delete" that removed the last
      // character in the recipient input field,
      // eg. type "a", then delete it.
      // Always remove the the existing results.
      this.liveSearchResults.innerHTML = '';
      return;
    }

    Contacts.findByString(filterValue, function gotContact(contacts) {
      // There are contacts that match the input.
      this.liveSearchResults.innerHTML = '';
      if (!contacts || !contacts.length) {
        return;
      }
      contacts.forEach(function(contact) {
        this.renderContact(contact, filterValue);
      }, this);
    }.bind(this));
  },

  pick: function thui_pick(successHandler, errorHandler) {
    try {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'webcontacts/contact'
        }
      });
      if (typeof successHandler === 'function') {
        activity.onsuccess = function() { successHandler(this.result); };
      }
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
      if (typeof errorHandler === 'function') {
        errorHandler();
      }
    }
  },

  activateContact: function thui_activateContact() {
    var _ = navigator.mozL10n.get;
    var phoneNumber = this.headerText.dataset.phoneNumber;
    // Call to 'option menu' or 'dialer' depending on existence of contact
    if (this.headerText.dataset.isContact == 'true') {
      ActivityPicker.call(phoneNumber);
    } else {
      var options = new OptionMenu({
        'items': [
        {
          name: _('call'),
          method: function optionMethod(param) {
            ActivityPicker.call(param);
          },
          params: [phoneNumber]
        },
        {
          name: _('createNewContact'),
          method: function optionMethod(param) {
            ActivityPicker.createNewContact(
              param, ThreadUI.onCreateContact);
          },
          params: [{'tel': phoneNumber}]
        },
        {
          name: _('addToExistingContact'),
          method: function optionMethod(param) {
            ActivityPicker.addToExistingContact(
              param, ThreadUI.onCreateContact);
        },
          params: [{'tel': phoneNumber}]
        },
        {
          name: _('cancel'),
          method: function optionMethod(param) {
          // TODO Add functionality if needed
          }
        }
        ],
        'title': phoneNumber
      });
      options.show();
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

window.confirm = window.confirm; // allow override in unit tests

window.addEventListener('resize', function resize() {
  ThreadUI.setInputMaxHeight();
  // Scroll to bottom
  ThreadUI.scrollViewToBottom();
});

}(this));


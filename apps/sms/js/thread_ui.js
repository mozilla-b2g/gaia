/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Compose, Recipients, Utils, AttachmentMenu, Template, Settings,
         URL, SMIL, Dialog, MessageManager, MozSmsFilter, LinkHelper,
         ActivityPicker, ThreadListUI, OptionMenu, Threads, Contacts,
         Attachment, WaitingScreen, MozActivity, LinkActionHandler,
         ActivityHandler */
/*exported ThreadUI */

(function(global) {
'use strict';

var attachmentMap = new WeakMap();

function thui_mmsAttachmentClick(target) {
  var attachment = attachmentMap.get(target);
  if (!attachment) {
    return false;
  }

  attachment.view({
    allowSave: true
  });

  return true;
}

// reduce the Composer.getContent() into slide format used by SMIL.generate some
// day in the future, we should make the SMIL and Compose use the same format
function thui_generateSmilSlides(slides, content) {
  var length = slides.length;
  if (typeof content === 'string') {
    if (!length || slides[length - 1].text) {
      slides.push({
        text: content
      });
    } else {
      slides[length - 1].text = content;
    }
  } else {
    slides.push({
      blob: content.blob,
      name: content.name
    });
  }
  return slides;
}

var ThreadUI = global.ThreadUI = {
  // Time buffer for the 'last-messages' set. In this case 10 min
  LAST_MESSAGES_BUFFERING_TIME: 10 * 60 * 1000,
  CHUNK_SIZE: 10,
  // duration of the notification that message type was converted
  CONVERTED_MESSAGE_DURATION: 3000,
  IMAGE_RESIZE_DURATION: 3000,
  // delay between 2 counter updates while composing a message
  UPDATE_DELAY: 500,
  recipients: null,
  // Set to |true| when in edit mode
  inEditMode: false,
  inThread: false,
  isNewMessageNoticeShown: false,
  _updateTimeout: null,
  init: function thui_init() {
    var templateIds = [
      'contact',
      'contact-photo',
      'highlight',
      'message',
      'not-downloaded',
      'number',
      'recipient'
    ];

    Compose.init('messages-compose-form');
    AttachmentMenu.init('attachment-options-menu');

    // Fields with 'messages' label
    [
      'container', 'subheader', 'to-field', 'recipients-list',
      'participants', 'participants-list', 'header-text', 'recipient',
      'input', 'compose-form', 'check-all-button', 'uncheck-all-button',
      'contact-pick-button', 'back-button', 'send-button', 'attach-button',
      'delete-button', 'cancel-button',
      'edit-icon', 'edit-mode', 'edit-form', 'tel-form',
      'max-length-notice', 'convert-notice', 'resize-notice',
      'new-message-notice'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('messages-' + id);
    }, this);

    this.mainWrapper = document.getElementById('main-wrapper');

    // Allow for stubbing in environments that do not implement the
    // `navigator.mozMobileMessage` API
    this._mozMobileMessage = navigator.mozMobileMessage ||
      window.DesktopMockNavigatormozMobileMessage;

    window.addEventListener('resize', this.resizeHandler.bind(this));

    // In case of input, we have to resize the input following UX Specs.
    Compose.on('input', this.messageComposerInputHandler.bind(this));

    Compose.on('type', this.onMessageTypeChange.bind(this));

    this.toField.addEventListener(
      'keypress', this.toFieldKeypress.bind(this), true
    );

    this.toField.addEventListener(
      'input', this.toFieldInput.bind(this), true
    );

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
      'click', this.onSendClick.bind(this)
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

    this.editIcon.addEventListener(
      'click', this.startEdit.bind(this)
    );

    this.deleteButton.addEventListener(
      'click', this.delete.bind(this)
    );

    this.headerText.addEventListener(
      'click', this.onHeaderActivation.bind(this)
    );

    this.participantsList.addEventListener(
      'click', this.onParticipantClick.bind(this)
    );

    this.newMessageNotice.addEventListener(
      'click', this.onNewMessageNoticeClick.bind(this)
    );

    // Assimilations
    // -------------------------------------------------
    // If the user manually types a recipient number
    // into the recipients list and does not "accept" it
    // via <ENTER> or ";", but proceeds to either
    // the message or attachment options, attempt to
    // gather those stranded recipients and assimilate them.
    //
    // Previously, an approach using the "blur" event on
    // the Recipients' "messages-to-field" element was used,
    // however the to-field will frequently lose "focus"
    // to any of its recipient children. If we assimilate on
    // to-field blur, the result is entirely unusable:
    //
    //  1. Focus will jump from the recipient input to the
    //      message input
    //  2. 1 or 2 characters may remain in the recipient
    //      editable, which will be "assimilated"
    //  3. If a user has made it past 1 & 2, any attempts to
    //      select a contact from contact search results
    //      will also jump focus to the message input field
    //
    //  Currently, there are 3 Assimilations.
    //

    var assimilate = this.assimilateRecipients.bind(this);

    // Assimilation 1
    this.input.addEventListener(
      'focus', assimilate
    );
    // Assimilation 1
    this.input.addEventListener(
      'click', assimilate
    );
    // Assimilation 2
    this.attachButton.addEventListener(
      'click', assimilate
    );

    this.container.addEventListener(
      'click', this.handleEvent.bind(this)
    );
    this.container.addEventListener(
      'contextmenu', this.handleEvent.bind(this)
    );
    this.editForm.addEventListener(
      'submit', this.handleEvent.bind(this)
    );
    this.composeForm.addEventListener(
      'submit', this.handleEvent.bind(this)
    );
    // For picking a contact from Contacts. It's mouse down for
    // avoiding weird effect of keyboard, as in 'send' button.
    this.contactPickButton.addEventListener(
      'mousedown', this.requestContact.bind(this)
    );

    this.tmpl = templateIds.reduce(function(tmpls, name) {
      tmpls[Utils.camelCase(name)] =
        Template('messages-' + name + '-tmpl');
      return tmpls;
    }, {});

    Utils.startTimeHeaderScheduler();

    this.initRecipients();

    // Initialized here, but used in ThreadUI.cleanFields
    this.previousHash = null;

    this._updateTimeout = null;

    // Cache fixed measurement while init
    var style = window.getComputedStyle(this.input, null);
    this.INPUT_MARGIN = parseInt(style.getPropertyValue('margin-top'), 10) +
      parseInt(style.getPropertyValue('margin-bottom'), 10);

    // Synchronize changes to the Compose field according to relevant changes
    // in the subheader.
    var subheaderMutationHandler = this.subheaderMutationHandler.bind(this);
    var subheaderMutation = new MutationObserver(subheaderMutationHandler);
    subheaderMutation.observe(this.subheader, {
      attributes: true, subtree: true
    });
    subheaderMutation.observe(document.getElementById('thread-messages'), {
      attributes: true
    });

    ThreadUI.setInputMaxHeight();
  },

  // Initialize Recipients list and Recipients.View (DOM)
  initRecipients: function thui_initRecipients() {
    var recipientsChanged = (function recipientsChanged() {
      // update composer header whenever recipients change
      this.updateComposerHeader();
      // check for enable send whenever recipients change
      this.enableSend();
      // Clean search result after recipient count change.
      this.container.textContent = '';
    }).bind(this);

    if (this.recipients) {
      this.recipients.length = 0;
      this.recipients.visible('singleline');
      this.recipients.focus();
    } else {
      this.recipients = new Recipients({
        outer: 'messages-to-field',
        inner: 'messages-recipients-list',
        template: this.tmpl.recipient
      });

      this.recipients.on('add', recipientsChanged);
      this.recipients.on('remove', recipientsChanged);
    }
    this.container.textContent = '';
  },

  initSentAudio: function thui_initSentAudio() {
    if (this.sentAudio) {
      return;
    }

    this.sentAudioKey = 'message.sent-sound.enabled';
    this.sentAudio = new Audio('/sounds/sent.ogg');
    this.sentAudio.mozAudioChannelType = 'notification';
    this.sentAudioEnabled = false;

    // navigator.mozSettings may not be defined in all environments
    if (navigator.mozSettings) {
      try {
        var req = navigator.mozSettings.createLock().get(this.sentAudioKey);
        req.onsuccess = (function onsuccess() {
          this.sentAudioEnabled = req.result[this.sentAudioKey];
        }).bind(this);

        navigator.mozSettings.addObserver(this.sentAudioKey, (function(e) {
          this.sentAudioEnabled = e.settingValue;
        }).bind(this));
      } catch (e) {
        this.sentAudioEnabled = false;
      }
    }
  },

  // Change the back button to close button
  enableActivityRequestMode: function thui_enableActivityRequestMode() {
    var domBackButtonSpan = this.backButton.querySelector('span');
    domBackButtonSpan.classList.remove('icon-back');
    domBackButtonSpan.classList.add('icon-close');
  },

  resetActivityRequestMode: function thui_resetActivityRequestMode() {
    var domBackButtonSpan = this.backButton.querySelector('span');
    domBackButtonSpan.classList.remove('icon-close');
    domBackButtonSpan.classList.add('icon-back');
  },

  getAllInputs: function thui_getAllInputs() {
    if (this.container) {
      return Array.prototype.slice.call(
        this.container.querySelectorAll('input[type=checkbox]')
      );
    } else {
      return [];
    }
  },

  getSelectedInputs: function thui_getSelectedInputs() {
    if (this.container) {
      return Array.prototype.slice.call(
        this.container.querySelectorAll('input[type=checkbox]:checked')
      );
    } else {
      return [];
    }
  },

  // Method for setting the body of a SMS/MMS from activity
  setMessageBody: function thui_setMessageBody(value) {
    Compose.clear();
    if (value) {
      Compose.append(value);
    }
    Compose.focus();
  },

  messageComposerInputHandler: function thui_messageInputHandler(event) {
    this.updateInputHeight();
    this.enableSend();

    if (Compose.type === 'sms') {
      return;
    }

    if (Compose.isResizing) {
      this.resizeNotice.classList.remove('hide');

      if (this._resizeNoticeTimeout) {
        clearTimeout(this._resizeNoticeTimeout);
        this._resizeNoticeTimeout = null;
      }
    } else {
      // Update counter after image resize complete
      this.updateCounterForMms();
      if (this.resizeNotice.classList.contains('hide') ||
          this._resizeNoticeTimeout) {
        return;
      }

      this._resizeNoticeTimeout = setTimeout(function hideResizeNotice() {
        this.resizeNotice.classList.add('hide');
        this._resizeNoticeTimeout = null;
      }.bind(this), this.IMAGE_RESIZE_DURATION);
    }
  },

  assimilateRecipients: function thui_assimilateRecipients() {
    var isNew = window.location.hash === '#new';
    var node = this.recipientsList.lastChild;
    var typed;

    if (!isNew || node === null) {
      return;
    }

    // Restore the recipients list input area to
    // single line view.
    this.recipients.visible('singleline');

    do {
      if (node.isPlaceholder) {
        typed = node.textContent.trim();

        // Clicking on the compose input will trigger
        // an assimilation. If the recipient input
        // is a lone semi-colon:
        //
        //  1. Clear the contents of the editable placeholder
        //  2. Do not assimilate the value.
        //
        if (typed === ';') {
          node.textContent = '';
          break;
        }

        // If the user actually typed something,
        // assume it's a manually entered recipient.
        // Push a recipient into the recipients
        // list with the left behind entry.
        if (typed) {
          this.recipients.add({
            name: typed,
            number: typed,
            source: 'manual'
          });
          break;
        }
      }
    } while ((node = node.previousSibling));
  },

  onMessageTypeChange: function thui_onMessageType(event) {
    // if we are changing to sms type, we might want to cancel
    if (Compose.type === 'sms') {
      this.updateSmsSegmentLimit(function segmentLimitCallback(overLimit) {
        if (overLimit) {
          // we can't change to sms after all
          Compose.type = 'mms';
          return;
        }

        this.messageComposerTypeHandler();
      }.bind(this));
    } else {
      this.messageComposerTypeHandler();
    }
  },

  onMessageReceived: function thui_onMessageReceived(message) {
    this.appendMessage(message);
    this.scrollViewToBottom();
    Utils.updateTimeHeaders();
    if (this.isScrolledManually) {
      this.showNewMessageNotice(message);
    }
  },

  onNewMessageNoticeClick: function thui_onNewMessageNoticeClick(event) {
    event.preventDefault();
    this.hideNewMessageNotice();
    this.forceScrollViewToBottom();
  },

  // Message composer type changed:
  messageComposerTypeHandler: function thui_messageComposerTypeHandler() {
    this.updateCounter();

    var oldType = this.composeForm.dataset.messageType;
    var type = Compose.type;
    if (oldType === type) {
      return;
    }
    this.composeForm.dataset.messageType = type;

    var message = 'converted-to-' + type;
    var messageContainer = this.convertNotice.querySelector('p');
    navigator.mozL10n.localize(messageContainer, message);
    this.convertNotice.classList.remove('hide');

    if (this._convertNoticeTimeout) {
      clearTimeout(this._convertNoticeTimeout);
    }

    this._convertNoticeTimeout = setTimeout(function hideConvertNotice() {
      this.convertNotice.classList.add('hide');
    }.bind(this), this.CONVERTED_MESSAGE_DURATION);
  },

  // Ensure that when the subheader is updated, the Compose field's dimensions
  // are updated to avoid interference.
  subheaderMutationHandler: function thui_subheaderMutationHandler() {
    this.setInputMaxHeight();
    this.updateInputHeight();
  },

  // Triggered when the onscreen keyboard appears/disappears.
  resizeHandler: function thui_resizeHandler() {
    if (!this.inEditMode) {
      this.setInputMaxHeight();
      this.updateInputHeight();
    }

    // Scroll to bottom
    this.scrollViewToBottom();
    // Make sure the caret in the "Compose" area is visible
    Compose.scrollMessageContent();
  },

  // Create a recipient from contacts activity.
  requestContact: function thui_requestContact() {
    // assimilate stranded string before picking a contact.
    this.assimilateRecipients();

    if (typeof MozActivity === 'undefined') {
      console.log('MozActivity unavailable');
      return;
    }

    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'webcontacts/tel'
      }
    });

    activity.onsuccess = (function() {
      // As we have the whole contact from the activity, there is no
      // need for adding a second request to Contacts API.
      var dummyResolver = function dummyResolver(phoneNumber, cb) {
        cb(activity.result);
      };

      if (!activity.result ||
          !activity.result.tel ||
          !activity.result.tel.length ||
          !activity.result.tel[0].value) {
        console.error('The pick activity result is invalid.');
        return;
      }

      Utils.getContactDisplayInfo(dummyResolver,
        activity.result.tel[0].value,
        (function onData(data) {
        data.source = 'contacts';
        this.recipients.add(data);
      }).bind(this));
    }).bind(this);

    activity.onerror = (function(e) {
      console.log('WebActivities unavailable? : ' + e);
    }).bind(this);
  },

  // Method for updating the header when needed
  updateComposerHeader: function thui_updateComposerHeader() {
    var recipientCount = this.recipients.length;
    if (recipientCount > 0) {
      navigator.mozL10n.localize(this.headerText, 'recipient', {
          n: recipientCount
      });
    } else {
      navigator.mozL10n.localize(this.headerText, 'newMessage');
    }
    // Check if we need to enable send button.
    this.enableSend();
  },

  // scroll position is considered as "manual" if the view is not completely
  // scrolled to the bottom
  isScrolledManually: false,

  // We define an edge for showing the following chunk of elements
  manageScroll: function thui_manageScroll(oEvent) {
    var scrollTop = this.container.scrollTop;
    var scrollHeight = this.container.scrollHeight;
    var clientHeight = this.container.clientHeight;

    this.isScrolledManually = ((scrollTop + clientHeight) < scrollHeight);

    // Check if the banner has been showed and close it when the scroll
    // reach the bottom
    if (!this.isScrolledManually && this.isNewMessageNoticeShown) {
      this.hideNewMessageNotice();
    }

    // kEdge will be the limit (in pixels) for showing the next chunk
    var kEdge = 30;
    if (scrollTop < kEdge) {
      this.showChunkOfMessages(this.CHUNK_SIZE);
      // We update the scroll to the previous position
      // taking into account the previous offset to top
      // and the current height due to we have added a new
      // chunk of visible messages
      this.container.scrollTop =
        (this.container.scrollHeight - scrollHeight) + scrollTop;
    }
  },

  scrollViewToBottom: function thui_scrollViewToBottom() {
    if (!this.isScrolledManually && this.container.lastElementChild) {
      this.container.lastElementChild.scrollIntoView(false);
    }
  },

  forceScrollViewToBottom: function thui_forceScrollViewToBottom() {
    this.isScrolledManually = false;
    this.scrollViewToBottom();
  },

  showNewMessageNotice: function thui_showNewMessageNotice(message) {
    Contacts.findByPhoneNumber(message.sender, (function gotContact(contact) {
      var sender = message.sender;
      if (contact && contact.length) {
        var details = Utils.getContactDetails(sender, contact[0]);
        sender = details.title || sender;
        // Get the first name
        var index = sender.indexOf(' ');
        if (index !== -1) {
          sender = sender.slice(0, index);
        }
      }

      var newMessageContactNode = document.getElementById(
        'new-message-notice-contact'
      );

      newMessageContactNode.textContent = sender;

      this.isNewMessageNoticeShown = true;
      this.newMessageNotice.classList.remove('hide');
    }).bind(this));
  },

  hideNewMessageNotice: function thui_hideNewMessageNotice() {
    this.isNewMessageNoticeShown = false;
    //Hide the new message's banner
    this.newMessageNotice.classList.add('hide');
  },
  // Limit the maximum height of the Compose input field such that it never
  // grows larger than the space available.
  setInputMaxHeight: function thui_setInputMaxHeight() {
    var viewHeight;
    var threadSliverHeight = 30;
    // The max height should be constrained by the following factors:
    var adjustment =
      // The height of the absolutely-position sub-header element
      this.subheader.offsetHeight +
      // the vertical margin of the input field
      this.INPUT_MARGIN;

    // Further constrain the max height by an artificial spacing to prevent the
    // input field from completely occluding the message thread (not necessary
    // when creating a new thread).
    if (window.location.hash !== '#new') {
      adjustment += threadSliverHeight;
    }

    // when the border bottom is bigger than the available space, then
    // offsetHeight is also too big, and as a result we can't calculate the max
    // height. So we nullify the border bottom width before getting the offset
    // height.
    // TODO: we should find something better than that because this probably
    // triggers a synchronous workflow (bug 891029).
    this.container.style.borderBottomWidth = null;
    viewHeight = this.container.offsetHeight;
    var maxHeight = viewHeight - adjustment;
    this.input.style.maxHeight = maxHeight + 'px';
    generateHeightRule(maxHeight);
  },

  back: function thui_back() {

    if (window.location.hash === '#group-view') {
      window.location.hash = '#thread=' + Threads.lastId;
      this.updateHeaderData();
      return;
    }

    var goBack = (function() {
      this.stopRendering();

      var currentActivity = ActivityHandler.currentActivity.new;
      if (currentActivity) {
        currentActivity.postResult({ success: true });
        ActivityHandler.resetActivity();
        return;
      }
      if (Compose.isEmpty()) {
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

    // should disable if we have no message input
    var disableSendMessage = Compose.isEmpty() || Compose.isResizing;
    var messageNotLong = this.updateCounter();
    var hasRecipients = this.recipients &&
      (this.recipients.length || !!this.recipients.inputValue);

    // should disable if the message is too long
    disableSendMessage = disableSendMessage || !messageNotLong;

    // should disable if we have no recipients in the "new thread" view
    disableSendMessage = disableSendMessage ||
      (window.location.hash == '#new' && !hasRecipients);

    this.sendButton.disabled = disableSendMessage;
  },

  // asynchronously updates the counter for sms segments when in text only mode
  // pass 'true' to the callback when the limit is over the segment limit
  updateSmsSegmentLimit: function thui_updateSmsSegmentLimit(callback) {
    if (!(this._mozMobileMessage &&
          this._mozMobileMessage.getSegmentInfoForText)) {
      return false;
    }

    var value = Compose.getText();
    // We set maximum concatenated number of our SMS app to 10 based on:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=813686#c0
    var kMaxConcatenatedMessages = 10;

    // Use backend api for precise sms segmentation information.
    var smsInfoRequest = this._mozMobileMessage.getSegmentInfoForText(value);
    smsInfoRequest.onsuccess = (function onSmsInfo(event) {
      if (Compose.type !== 'sms') {
        // bailout if the type changed since the request started
        return;
      }

      var smsInfo = event.target.result;
      var segments = smsInfo.segments;
      var availableChars = smsInfo.charsAvailableInLastSegment;

      // in MMS mode, the counter value isn't used anyway, so we can update this
      this.sendButton.dataset.counter = availableChars + '/' + segments;

      // if we are going to force MMS, this is true anyway, so adding
      // has-counter again doesn't hurt us.
      var showCounter = (segments && (segments > 1 || availableChars <= 10));
      this.sendButton.classList.toggle('has-counter', showCounter);

      var overLimit = segments > kMaxConcatenatedMessages;
      callback(overLimit);
    }).bind(this);
    smsInfoRequest.onerror = (function onSmsInfoError(e) {
      this.sendButton.classList.remove('has-counter');
    }).bind(this);
  },

  // will return true if we can send the message, false if we can't send the
  // message
  updateCounter: function thui_updateCount() {
    if (Compose.type === 'mms') {
      return this.updateCounterForMms();
    } else {
      Compose.lock = false;
      if (this._updateTimeout === null) {
        this._updateTimeout = setTimeout(this.updateCounterForSms.bind(this),
            this.UPDATE_DELAY);
      }
      return true;
    }
  },

  updateCounterForSms: function thui_updateCounterForSms() {
    // We nullify this timeout here rather than in the updateSmsSegmentLimit
    // callback because otherwise we could display an information that is not
    // current.
    // With the timeout, the risk of having 2 requests in the same time,
    // returning in a different order, which would actually display old
    // information, is very tiny, so we should be good without adding another
    // lock.
    this._updateTimeout = null;
    this.maxLengthNotice.classList.add('hide');
    this.updateSmsSegmentLimit((function segmentLimitCallback(overLimit) {
      if (overLimit) {
        Compose.type = 'mms';
      }
    }).bind(this));
    return true;
  },

  updateCounterForMms: function thui_updateCounterForMms() {
    // always turn on the counter for mms, it just displays "MMS"
    this.sendButton.classList.add('has-counter');
    // Counter should be updated when image resizing complete
    if (Compose.isResizing) {
      return false;
    }

    if (Settings.mmsSizeLimitation) {
      if (Compose.size > Settings.mmsSizeLimitation) {
        Compose.lock = true;
        navigator.mozL10n.localize(this.maxLengthNotice.querySelector('p'),
          'messages-exceeded-length-text');
        this.maxLengthNotice.classList.remove('hide');
        return false;
      } else if (Compose.size === Settings.mmsSizeLimitation) {
        Compose.lock = true;
        navigator.mozL10n.localize(this.maxLengthNotice.querySelector('p'),
          'messages-max-length-text');
        this.maxLengthNotice.classList.remove('hide');
        return true;
      }
    }

    Compose.lock = false;
    this.maxLengthNotice.classList.add('hide');
    return true;
  },

  // TODO this function probably triggers synchronous workflows, we should
  // remove them (Bug 891029)
  updateInputHeight: function thui_updateInputHeight() {
    // First of all we retrieve all CSS info which we need
    var verticalMargin = this.INPUT_MARGIN;
    var inputMaxHeight = parseInt(this.input.style.maxHeight, 10);
    var buttonHeight = this.sendButton.offsetHeight;

    // we need to set it back to auto so that we know its "natural size"
    // this will trigger a sync reflow when we get its scrollHeight at the next
    // line, so we should try to find something better
    // maybe in Bug 888950
    this.input.style.height = 'auto';

    // the new height is different whether the current height is bigger than the
    // max height
    var newHeight = Math.min(this.input.scrollHeight, inputMaxHeight);

    // We calculate the height of the Compose form which contains the input
    // and we set the bottom border of the container so the Compose field does
    // not occlude the messages. `padding-bottom` is not used because it is
    // applied at the content edge, not after any overflow (see "Bug 748518 -
    // padding-bottom is ignored with overflow:auto;")
    this.input.style.height = newHeight + 'px';
    this.composeForm.style.height =
      this.container.style.borderBottomWidth =
      newHeight + verticalMargin + 'px';

    // We set the buttons' top margin to ensure they render at the bottom of
    // the container
    var buttonOffset = newHeight + verticalMargin - buttonHeight;
    this.sendButton.style.marginTop =
      this.attachButton.style.marginTop = buttonOffset + 'px';

    this.scrollViewToBottom();
  },

  findNextContainer: function thui_findNextContainer(container) {
    if (!container) {
      return null;
    }

    var nextContainer = container;
    do {
      nextContainer = nextContainer.nextElementSibling;
    } while (nextContainer && nextContainer.tagName !== 'UL');

    return nextContainer;
  },

  findFirstContainer: function thui_findFirstLastContainer() {
    var container = this.container.firstElementChild;
    if (container && container.tagName !== 'UL') {
      container = this.findNextContainer(container);
    }
    return container;
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  getMessageContainer:
    function thui_getMessageContainer(messageTimestamp, hidden) {
    var startOfDayTimestamp = Utils.getDayDate(messageTimestamp);
    var now = Date.now();
    var messageContainer, header;
    // If timestamp belongs to [now, now - TimeBuffer]
    var lastMessageDelay = this.LAST_MESSAGES_BUFFERING_TIME;
    var isLastMessagesBlock =
      (messageTimestamp >= (now - lastMessageDelay));

    // Is there any container with our requirements?
    if (isLastMessagesBlock) {
      messageContainer = document.getElementById('last-messages');
      if (messageContainer) {
        var oldTimestamp = messageContainer.dataset.timestamp;
        var oldDayTimestamp = Utils.getDayDate(oldTimestamp);
        var shouldCreateNewBlock =
          (oldDayTimestamp !== startOfDayTimestamp) || // new day
          (oldTimestamp < messageTimestamp - lastMessageDelay); // too old

        if (shouldCreateNewBlock) {
          messageContainer.id = 'mc_' + Utils.getDayDate(oldTimestamp);
          messageContainer.dataset.timestamp = oldDayTimestamp;
          messageContainer = null;
        }
      }
    } else {
      messageContainer = document.getElementById('mc_' + startOfDayTimestamp);
    }

    if (messageContainer) {
      header = messageContainer.previousElementSibling;
      if (messageTimestamp < header.dataset.time) {
        header.dataset.time = messageTimestamp;
      }
      return messageContainer;
    }

    // If there is no messageContainer we have to create it
    // Create DOM Elements
    header = document.createElement('header');
    messageContainer = document.createElement('ul');

    // Append 'time-update' state
    header.dataset.timeUpdate = true;
    header.dataset.time = messageTimestamp;

    // Add text
    if (isLastMessagesBlock) {
      var lastContainer = this.container.lastElementChild;
      if (lastContainer) {
        var lastDay = Utils.getDayDate(lastContainer.dataset.timestamp);
        if (lastDay === startOfDayTimestamp) {
          // same day -> show only the time
          header.dataset.timeOnly = 'true';
        }
      }

      messageContainer.id = 'last-messages';
      messageContainer.dataset.timestamp = messageTimestamp;
    } else {
      messageContainer.id = 'mc_' + startOfDayTimestamp;
      messageContainer.dataset.timestamp = startOfDayTimestamp;
    }

    if (hidden) {
      header.classList.add('hidden');
    } else {
      Utils.updateTimeHeader(header);
    }

    // Where do I have to append the Container?
    // If is the 'last-messages' one should be the most recent one.
    if (isLastMessagesBlock) {
      this.container.appendChild(header);
      this.container.appendChild(messageContainer);
      return messageContainer;
    }

    // In other case we have to look for the right place for appending
    // the message
    var insertBeforeContainer;
    var curContainer = this.findFirstContainer();

    while (curContainer &&
           +curContainer.dataset.timestamp < startOfDayTimestamp) {
      curContainer = this.findNextContainer(curContainer);
    }

    insertBeforeContainer = curContainer;

    // Finally we append the container & header in the right position
    // With this function, "inserting before 'null'" means "appending"
    this.container.insertBefore(messageContainer,
      insertBeforeContainer ? insertBeforeContainer.previousSibling : null);
    this.container.insertBefore(header, messageContainer);

    // if the next container is the same date => we must update his header
    if (insertBeforeContainer) {
      var nextContainerTimestamp = insertBeforeContainer.dataset.timestamp;
      if (startOfDayTimestamp === Utils.getDayDate(nextContainerTimestamp)) {
        header = insertBeforeContainer.previousElementSibling;
        header.dataset.timeOnly = 'true';
      }
    }
    return messageContainer;
  },

  // Method for updating the header with the info retrieved from Contacts API
  updateHeaderData: function thui_updateHeaderData(callback) {
    var thread, number, others;

    if (Threads.currentId) {
      thread = Threads.active;
    }

    if (!thread) {
      if (callback) {
        callback();
      }
      return;
    }

    if (window.location.hash === '#group-view') {
      return;
    }

    number = thread.participants[0];
    others = thread.participants.length - 1;

    // For Desktop testing, there is a fake mozContacts but it's not working
    // completely. So in the case of Desktop testing we are going to execute
    // the callback directly in order to make it work!
    // https://bugzilla.mozilla.org/show_bug.cgi?id=836733
    if (!this._mozMobileMessage && callback) {
      navigator.mozL10n.localize(this.headerText, 'thread-header-text', {
        name: number,
        n: others
      });
      setTimeout(callback);
      return;
    }

    // Add data to contact activity interaction
    this.headerText.dataset.number = number;

    // For the basic display, we only need the first contact's information --
    // e.g. for 3 contacts, the app displays:
    //
    //    Jane Doe (+2)
    //
    Contacts.findByPhoneNumber(number, function gotContact(contacts) {
      var carrierTag = document.getElementById('contact-carrier');
      var threadMessages = document.getElementById('thread-messages');
      // Bug 867948: contacts null is a legitimate case, and
      // getContactDetails is okay with that.
      var details = Utils.getContactDetails(number, contacts);
      var contactName = details.title || number;
      var carrierText;

      this.headerText.dataset.isContact = !!details.isContact;
      this.headerText.dataset.title = contactName;
      navigator.mozL10n.localize(this.headerText, 'thread-header-text', {
          name: contactName,
          n: others
      });

      // The carrier banner is meaningless and confusing in
      // group message mode.
      if (thread.participants.length === 1 &&
          (contacts && contacts.length)) {


        carrierText = Utils.getCarrierTag(
          number, contacts[0].tel, details
        );

        // Known Contact with at least:
        //
        //  1. a name
        //  2. a carrier
        //  3. a type
        //

        if (carrierText) {
          carrierTag.textContent = carrierText;
          threadMessages.classList.add('has-carrier');
        } else {
          threadMessages.classList.remove('has-carrier');
        }
      } else {
        // Hide carrier tag in group message or unknown contact cases.
        threadMessages.classList.remove('has-carrier');
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
    var container = document.createDocumentFragment();
    var scrollViewToBottom = ThreadUI.scrollViewToBottom.bind(ThreadUI);

    dataArray.forEach(function(messageData) {

      if (messageData.blob) {
        var attachment = new Attachment(messageData.blob, {
          name: messageData.name
        });
        var mediaElement = attachment.render(scrollViewToBottom);
        container.appendChild(mediaElement);
        attachmentMap.set(mediaElement, attachment);
      }

      if (messageData.text) {
        var textElement = document.createElement('span');

        // escape text for html and look for clickable numbers, etc.
        var text = Template.escape(messageData.text);
        text = LinkHelper.searchAndLinkClickableData(text);

        textElement.innerHTML = text;
        container.appendChild(textElement);
      }
    });
    return container;
  },

  // Method for rendering the list of messages using infinite scroll
  renderMessages: function thui_renderMessages(threadId, callback) {
    var onMessagesRendered = (function messagesRendered() {
      if (this.messageIndex < this.CHUNK_SIZE) {
        this.showFirstChunk();
      }

      if (callback) {
        callback();
      }
    }).bind(this);

    function onMessagesDone() {
      setTimeout(
        MessageManager.markThreadRead.bind(MessageManager, filter.threadId)
      );
    }

    var onRenderMessage = (function renderMessage(message) {
      if (this._stopRenderingNextStep) {
        // stop the iteration
        return false;
      }
      this.appendMessage(message,/*hidden*/ true);
      this.messageIndex++;
      if (this.messageIndex === this.CHUNK_SIZE) {
        this.showFirstChunk();
      }
      return true;
    }).bind(this);

    // We initialize all params before rendering
    this.initializeRendering();

    var filter = new MozSmsFilter();
    filter.threadId = threadId;

    // We call getMessages with callbacks
    var renderingOptions = {
      each: onRenderMessage,
      filter: filter,
      invert: false,
      end: onMessagesRendered,
      done: onMessagesDone
    };

    MessageManager.getMessages(renderingOptions);
    // force the next scroll to bottom
    this.isScrolledManually = false;
  },

  // generates the html for not-downloaded messages - pushes class names into
  // the classNames array also passed in, returns an HTML string
  _createNotDownloadedHTML:
  function thui_createNotDownloadedHTML(message, classNames) {
    // default strings:
    var messageL10nId = 'not-downloaded-mms';
    var downloadL10nId = 'download';

    // assuming that incoming message only has one deliveryStatus
    var status = message.deliveryStatus[0];

    var expireFormatted = Utils.date.format.localeFormat(
      message.expiryDate, navigator.mozL10n.get('dateTimeFormat_%x')
    );

    var expired = +message.expiryDate < Date.now();

    if (expired) {
      classNames.push('expired');
      messageL10nId = 'expired-mms';
    }

    if (status === 'error') {
      classNames.push('error');
    }

    if (status === 'pending') {
      downloadL10nId = 'downloading';
      classNames.push('pending');
    }

    return this.tmpl.notDownloaded.interpolate({
      messageL10nId: messageL10nId,
      messageL10nArgs: JSON.stringify({ date: expireFormatted }),
      messageL10nDate: message.expiryDate.toString(),
      messageL10nDateFormat: 'dateTimeFormat_%x',
      downloadL10nId: downloadL10nId
    });
  },

  // Check deliveryStatus for both single and multiple recipient case.
  // In multiple recipient case, we return true only when all the recipients
  // deliveryStatus set to success.
  isDeliveryStatusSuccess: function thui_isDeliveryStatusSuccess(message) {
    var statusSet = message.deliveryStatus;
    if (Array.isArray(statusSet)) {
      return statusSet.every(function(status) {
        return status === 'success';
      });
    } else {
      return statusSet === 'success';
    }
  },

  buildMessageDOM: function thui_buildMessageDOM(message, hidden) {
    var bodyHTML = '';
    var delivery = message.delivery;
    var isDelivered = this.isDeliveryStatusSuccess(message);
    var messageDOM = document.createElement('li');

    var classNames = ['message', message.type, delivery];

    var notDownloaded = delivery === 'not-downloaded';
    var attachments = message.attachments;
    // Returning attachments would be different based on gecko version:
    // null in b2g18 / empty array in master.
    var noAttachment = (message.type === 'mms' && !notDownloaded &&
      (attachments === null || attachments.length === 0));

    if (delivery === 'received' || notDownloaded) {
      classNames.push('incoming');
    } else {
      classNames.push('outgoing');
    }

    if (delivery === 'sent' && isDelivered) {
      classNames.push('delivered');
    }

    if (hidden) {
      classNames.push('hidden');
    }

    if (message.type && message.type === 'sms') {
      var escapedBody = Template.escape(message.body || '');
      bodyHTML = LinkHelper.searchAndLinkClickableData(escapedBody);
    }

    if (notDownloaded) {
      bodyHTML = this._createNotDownloadedHTML(message, classNames);
    }

    if (noAttachment) {
      classNames = classNames.concat(['error', 'no-attachment']);
    }

    messageDOM.className = classNames.join(' ');
    messageDOM.id = 'message-' + message.id;
    messageDOM.dataset.messageId = message.id;

    messageDOM.innerHTML = this.tmpl.message.interpolate({
      id: String(message.id),
      bodyHTML: bodyHTML
    }, {
      safe: ['bodyHTML']
    });

    navigator.mozL10n.translate(messageDOM);

    var pElement = messageDOM.querySelector('p');
    if (noAttachment) {
      navigator.mozL10n.localize(pElement, 'no-attachment-text');
    }

    if (message.type === 'mms' && !notDownloaded && !noAttachment) { // MMS
      SMIL.parse(message, function(slideArray) {
        pElement.appendChild(ThreadUI.createMmsContent(slideArray));
      });
    }

    return messageDOM;
  },

  appendMessage: function thui_appendMessage(message, hidden) {
    var timestamp = message.timestamp.getTime();

    // look for an old message and remove it first - prevent anything from ever
    // double rendering for now
    var messageDOM = document.getElementById('message-' + message.id);

    if (messageDOM) {
      this.removeMessageDOM(messageDOM);
    }

    // build messageDOM adding the links
    messageDOM = this.buildMessageDOM(message, hidden);

    messageDOM.dataset.timestamp = timestamp;
    // Add to the right position
    var messageContainer = this.getMessageContainer(timestamp, hidden);
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

    if (this.mainWrapper.classList.contains('edit')) {
      this.checkInputs();
    }
  },

  showChunkOfMessages: function thui_showChunkOfMessages(number) {
    var elements = ThreadUI.container.getElementsByClassName('hidden');
    for (var i = elements.length - 1; i >= 0; i--) {
      var element = elements[i];
      element.classList.remove('hidden');
      if (element.tagName === 'HEADER') {
        Utils.updateTimeHeader(element);
      }
    }
  },

  cleanForm: function thui_cleanForm() {
    // Reset all inputs
    var inputs = this.allInputs;
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    // Reset vars for deleting methods
    this.checkInputs();
  },

  clear: function thui_clear() {
    this.initRecipients();
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

  startEdit: function thui_edit() {
    this.inEditMode = true;
    this.cleanForm();

    this.mainWrapper.classList.toggle('edit');

    // Ensure the Edit Mode menu does not occlude the final messages in the
    // thread.
    this.container.style.borderBottomWidth =
      this.editForm.querySelector('menu').offsetHeight + 'px';
  },

  deleteUIMessages: function thui_deleteUIMessages(list, callback) {
    // Strategy:
    // - Delete message/s from the DOM
    // - Update the thread in thread-list without re-rendering
    // the entire list
    // - Change hash if needed

    if (!Array.isArray(list)) {
      list = [list];
    }
    // Removing from DOM all messages to delete
    for (var i = 0, l = list.length; i < l; i++) {
      ThreadUI.removeMessageDOM(
        document.getElementById('message-' + list[i])
      );
    }
    callback = typeof callback === 'function' ? callback : function() {};
    // Retrieve threadID
    var threadId = Threads.currentId;
    // Do we remove all messages of the Thread?
    if (!ThreadUI.container.firstElementChild) {
      // Remove the thread from DOM and go back to the thread-list
      ThreadListUI.removeThread(threadId);
      callback();
      window.location.hash = '#thread-list';
    } else {
      // Retrieve latest message in the UI
      var lastMessageId =
        ThreadUI.container.querySelector('li:last-child').dataset.messageId;
      var request = MessageManager.getMessage(+lastMessageId);
      // We need to make Thread-list to show the same info
      request.onsuccess = function() {
        var message = request.result;
        callback();
        ThreadListUI.updateThread(message);
      };

      request.onerror = function() {
        console.error('Error when updating the list of threads');
        callback();
      };
    }
  },

  delete: function thui_delete() {
    var question = navigator.mozL10n.get('deleteMessages-confirmation');
    if (window.confirm(question)) {
      WaitingScreen.show();
      var delNumList = [];
      var inputs = ThreadUI.selectedInputs;
      var length = inputs.length;
      for (var i = 0; i < length; i++) {
        delNumList.push(+inputs[i].value);
      }
      // Complete deletion in DB and in UI
      MessageManager.deleteMessage(delNumList,
        function onDeletionDone() {
          ThreadUI.deleteUIMessages(delNumList, function uiDeletionDone() {
            ThreadUI.cancelEdit();
            WaitingScreen.hide();
          });
        }
      );
    }
  },

  cancelEdit: function thlui_cancelEdit() {
    this.inEditMode = false;
    this.updateInputHeight();
    this.mainWrapper.classList.remove('edit');
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
    var selected = this.selectedInputs;
    var allInputs = this.allInputs;
    if (selected.length == allInputs.length) {
      this.checkAllButton.disabled = true;
    } else {
      this.checkAllButton.disabled = false;
    }
    if (selected.length > 0) {
      this.uncheckAllButton.disabled = false;
      this.deleteButton.classList.remove('disabled');
      navigator.mozL10n.localize(this.editMode, 'selected',
        {n: selected.length});
    } else {
      this.uncheckAllButton.disabled = true;
      this.deleteButton.classList.add('disabled');
      navigator.mozL10n.localize(this.editMode, 'editMode');
    }
  },

  handleMessageClick: function thui_handleMessageClick(evt) {
    var currentNode = evt.target;
    var elems = {};

    // Walk up the DOM, inspecting all the elements
    while (currentNode && currentNode.classList) {
      if (currentNode.classList.contains('bubble')) {
        elems.bubble = currentNode;
      } else if (currentNode.classList.contains('message')) {
        elems.message = currentNode;
      } else if (currentNode.classList.contains('pack-end')) {
        elems.packEnd = currentNode;
      }
      currentNode = currentNode.parentNode;
    }

    // Click event handlers that occur outside of a message element should be
    // defined elsewhere.
    if (!(elems.message && elems.bubble)) {
      return;
    }

    // handle not-downloaded messages
    if (elems.message.classList.contains('not-downloaded')) {

      // do nothing for pending downloads, or expired downloads
      if (elems.message.classList.contains('expired') ||
        elems.message.classList.contains('pending')) {
        return;
      }
      this.retrieveMMS(elems.message.dataset.messageId);
      return;
    }

    // Do nothing for no attachment error because it's not possible to
    // retrieve message again in this edge case.
    if (elems.message.classList.contains('no-attachment')) {
      return;
    }

    // Click events originating from a "pack-end" aside of an error message
    // should trigger a prompt for retransmission.
    if (elems.message.classList.contains('error') && elems.packEnd) {
      if (window.confirm(navigator.mozL10n.get('resend-confirmation'))) {
        this.resendMessage(elems.message.dataset.messageId);
      }
      return;
    }
  },

  /*
   * Given an element of a message, this function will dive into
   * the DOM for getting the bubble container of this message.
   */

  getMessageBubble: function thui_getMessageContainer(element) {
    var node = element;
    do {
      if (node.dataset && node.dataset.messageId) {
        return {
          id: +node.dataset.messageId,
          node: node
        };
      }
    } while ((node = node.parentNode));

    return null;
  },

  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (!this.inEditMode) {
          // if the click wasn't on an attachment check for other clicks
          if (!thui_mmsAttachmentClick(evt.target)) {
            this.handleMessageClick(evt);
            LinkActionHandler.onClick(evt);
          }
          return;
        }

        var input = evt.target.parentNode.querySelector('input');
        if (input) {
          this.chooseMessage(input);
          this.checkInputs();
        }
        break;
      case 'contextmenu':
        var messageBubble = this.getMessageBubble(evt.target);

        if (!messageBubble) {
          return;
        }

        // Show options per single message.
        // TODO Add the following functionality:
        // + Details of a single message:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=901453
        // + Forward of a single message:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=927784
        var messageId = messageBubble.id;
        var params = {
          items:
            [
              {
                l10nId: 'delete',
                method: function deleteMessage(messageId) {
                  // Complete deletion in DB and UI
                  MessageManager.deleteMessage(messageId,
                    function onDeletionDone() {
                      ThreadUI.deleteUIMessages(messageId);
                    }
                  );
                },
                params: [messageId]
              },
              // TODO Add forward & details options
              {
                l10nId: 'cancel'
              }
            ],
          type: 'action',
          header: navigator.mozL10n.get('message-options')
        };

        var options = new OptionMenu(params);
        options.show();

        break;
      case 'submit':
        evt.preventDefault();
        break;
    }
  },

  cleanFields: function thui_cleanFields(forceClean) {
    var clean = (function clean() {
      // Compose.clear might cause a conversion from mms -> sms
      // Therefore we're reseting the message type here because
      // in messageComposerTypeHandler we're using this value to know
      // if the message type changed, and to display the convertNotice
      // accordingly
      this.composeForm.dataset.messageType = 'sms';

      Compose.clear();

      // reset the counter
      this.sendButton.dataset.counter = '';
      this.sendButton.classList.remove('has-counter');

      if (window.location.hash === '#new') {
        this.initRecipients();
        this.updateComposerHeader();
      }
    }).bind(this);

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

  onSendClick: function thui_onSendClick() {
    // don't send an empty message
    if (Compose.isEmpty()) {
      return;
    }

    // Assimilation 3 (see "Assimilations" above)
    // User may return to recipients, type a new recipient
    // manually and then click the sendButton without "accepting"
    // the recipient.
    this.assimilateRecipients();

    // not sure why this happens - replace me if you know
    this.container.classList.remove('hide');

    var content = Compose.getContent();
    var messageType = Compose.type;
    var recipients;

    // Depending where we are, we get different nums
    if (window.location.hash === '#new') {
      if (!this.recipients.length) {
        return;
      }
      recipients = this.recipients.numbers;
    } else {
      recipients = Threads.active.participants;
    }

    // Clean composer fields (this lock any repeated click in 'send' button)
    this.cleanFields(true);

    this.updateHeaderData();

    // Send the Message
    if (messageType === 'sms') {
      MessageManager.sendSMS(recipients, content[0], null, null,
        function onComplete(requestResult) {
          if (requestResult.hasError) {
            var errors = {};
            requestResult.return.forEach(function(result) {
              if (result.success) {
                return;
              }

              if (errors[result.code.name] === undefined) {
                errors[result.code.name] = [result.recipient];
              } else {
                errors[result.code.name].push(result.recipient);
              }
            });

            for (var key in errors) {
              this.showSendMessageError(key, errors[key]);
            }
          }
        }.bind(this)
      );

      if (recipients.length > 1) {
        window.location.hash = '#thread-list';
      }
    } else {
      var smilSlides = content.reduce(thui_generateSmilSlides, []);
      MessageManager.sendMMS(recipients, smilSlides, null,
        function onError(error) {
          var errorName = error.name;
          this.showSendMessageError(errorName);
        }.bind(this)
      );
    }
  },

  onMessageSent: function thui_onMessageSent(message) {
    var messageDOM = document.getElementById('message-' + message.id);

    if (!messageDOM) {
      return;
    }

    // Update class names to reflect message state
    messageDOM.classList.remove('sending');
    messageDOM.classList.add('sent');

    // Play the audio notification
    if (this.sentAudioEnabled) {
      this.sentAudio.play();
    }
  },

  onMessageFailed: function thui_onMessageFailed(message) {
    var messageDOM = document.getElementById('message-' + message.id);
    // When this is the first message in a thread, we haven't displayed
    // the new thread yet. The error flag will be shown when the thread
    // will be rendered. See Bug 874043
    if (messageDOM) {

      // Check if it was painted as 'error' before
      if (messageDOM.classList.contains('error')) {
        return;
      }

      // Update class names to reflect message state
      messageDOM.classList.remove('sending');
      messageDOM.classList.add('error');
    }
  },

  onDeliverySuccess: function thui_onDeliverySuccess(message) {
    // We need to make sure all the recipients status got success event.
    if (!this.isDeliveryStatusSuccess(message)) {
      return;
    }

    var messageDOM = document.getElementById('message-' + message.id);

    if (!messageDOM) {
      return;
    }
    // Update class names to reflect message state
    messageDOM.classList.add('delivered');
  },

  showSendMessageError: function mm_sendMessageOnError(errorName, recipients) {
    var messageTitle = '';
    var messageBody = '';
    var messageBodyParams = {};
    var buttonLabel = '';

    switch (errorName) {

      case 'NoSimCardError':
        messageTitle = 'sendNoSimCardTitle';
        messageBody = 'sendNoSimCardBody';
        buttonLabel = 'sendNoSimCardBtnOk';
        break;
      case 'RadioDisabledError':
        messageTitle = 'sendAirplaneModeTitle';
        messageBody = 'sendAirplaneModeBody';
        buttonLabel = 'sendAirplaneModeBtnOk';
        break;
      case 'FdnCheckError':
        messageTitle = 'fdnBlockedTitle';
        messageBody = 'fdnBlockedBody';
        messageBodyParams = {
          n: recipients.length,
          numbers: recipients.join('<br />')
        };
        buttonLabel = 'fdnBlockedBtnOk';
        break;
      case 'NoSignalError':
      case 'NotFoundError':
      case 'UnknownError':
      case 'InternalError':
      case 'InvalidAddressError':
        /* falls through */
      default:
        messageTitle = 'sendGeneralErrorTitle';
        messageBody = 'sendGeneralErrorBody';
        buttonLabel = 'sendGeneralErrorBtnOk';
    }

    var dialog = new Dialog({
      title: {
        l10nId: messageTitle
      },
      body: {
        l10nId: messageBody,
        l10nArgs: messageBodyParams
      },
      options: {
        cancel: {
          text: {
            l10nId: buttonLabel
          }
        }
      }
    });
    dialog.show();
  },

  removeMessageDOM: function thui_removeMessageDOM(messageDOM) {
    // store the parent so we can check emptiness later
    var messagesContainer = messageDOM.parentNode;

    messagesContainer.removeChild(messageDOM);

    // was this the last one in the ul?
    if (!messagesContainer.firstElementChild) {
      // we remove header & container
      var header = messagesContainer.previousSibling;
      this.container.removeChild(header);
      this.container.removeChild(messagesContainer);
    }
  },

  retrieveMMS: function thui_retrieveMMS(messageId) {
    // force a number
    var id = +messageId;
    var request = MessageManager.retrieveMMS(id);
    var messageDOM = document.getElementById('message-' + id);
    var button = messageDOM.querySelector('button');

    messageDOM.classList.add('pending');
    messageDOM.classList.remove('error');
    navigator.mozL10n.localize(button, 'downloading');

    request.onsuccess = (function retrieveMMSSuccess() {
      this.removeMessageDOM(messageDOM);
    }).bind(this);

    request.onerror = (function retrieveMMSError() {
      messageDOM.classList.remove('pending');
      messageDOM.classList.add('error');
      navigator.mozL10n.localize(button, 'download');
    });
  },

  resendMessage: function thui_resendMessage(id) {
    // force id to be a number
    id = +id;

    var request = MessageManager.getMessage(id);

    request.onsuccess = (function() {
      var message = request.result;
      // Strategy:
      // - Delete from the DOM
      // - Resend (the resend will remove from the backend)
      // - resend accepts a optional callback that follows with
      // the result of the resending
      var messageDOM = document.getElementById('message-' + id);
      this.removeMessageDOM(messageDOM);

      MessageManager.resendMessage(message);
    }).bind(this);
  },

  // Returns true when a contact has been rendered
  // Returns false when no contact has been rendered
  renderContact: function thui_renderContact(params) {
    /**
     *
     * params {
     *   contact:
     *     A contact object.
     *
     *   input:
     *     Any input value associated with the contact,
     *     possibly from a search or similar operation.
     *
     *   target:
     *     UL node to append the rendered contact LI.
     *
     *   isContact:
     *     |true| if rendering a contact from stored contacts
     *     |false| if rendering an unknown contact
     *
     *   isSuggestion:
     *     |true| if the value params.input should be
     *     highlighted in the rendered HTML & all tel
     *     entries should be rendered.
     *
     *   renderPhoto:
     *     |true| if we want to retrieve the contact photo
     * }
     *
     */

    // Contact records that don't have phone numbers
    // cannot be sent SMS or MMS messages
    // TODO: Add email checking support for MMS
    if (params.contact.tel === null) {
      return false;
    }

    var contact = params.contact;
    var input = params.input.trim();
    var ul = params.target;
    var isContact = params.isContact;
    var isSuggestion = params.isSuggestion;
    var tels = contact.tel;
    var telsLength = tels.length;
    var renderPhoto = params.renderPhoto;

    // We search on the escaped HTML via a regular expression
    var escaped = Utils.escapeRegex(Template.escape(input));
    var escsubs = escaped.split(/\s+/);
    // Build a list of regexes used for highlighting suggestions
    var regexps = {
      name: escsubs.map(function(k) {
        // String matches occur on the beginning of a "word" to
        // maintain parity with the contact search algorithm which
        // only considers left aligned exact matches on words
        return new RegExp('^' + k, 'gi');
      }),
      number: [new RegExp(escaped, 'ig')]
    };

    if (!telsLength) {
      return false;
    }

    var include = renderPhoto ? { photoURL: true } : null;
    var details = isContact ?
      Utils.getContactDetails(tels[0].value, contact, include) : {
        name: '',
        photoURL: ''
      };

    for (var i = 0; i < telsLength; i++) {
      var current = tels[i];
      // Only render a contact's tel value entry for the _specified_
      // input value when not rendering a suggestion. If the tel
      // record value _doesn't_ match, then continue.
      //
      if (!isSuggestion && !Utils.probablyMatches(current.value, input)) {
        continue;
      }

      // If rendering for contact search result suggestions, don't
      // render contact tel records for values that are already
      // selected as recipients. This comparison should be safe,
      // as the value in this.recipients.numbers comes from the same
      // source that current.value comes from.
      if (isSuggestion && this.recipients.numbers.indexOf(current.value) > -1) {
        continue;
      }

      var li = document.createElement('li');

      var data = Utils.getDisplayObject(details.title, current);

      /*jshint loopfunc: true */
      ['name', 'number'].forEach(function(key) {
        var escapedData = Template.escape(data[key]);
        if (isSuggestion) {
          // When rendering a suggestion, we highlight the matched substring.
          // The approach is to escape the html and the search string, and
          // then replace on all "words" (whitespace bounded strings) with
          // the substring run through the highlight template.
          var splitData = escapedData.split(/\s+/);
          var loopReplaceFn = (function(match) {
            matchFound = true;
            // The match is safe, because splitData[i] is derived from
            // escapedData
            return this.tmpl.highlight.interpolate({
              str: match
            }, {
              safe: ['str']
            });
          }).bind(this);
          // For each "word"
          for (var i = 0; i < splitData.length; i++) {
            var matchFound = false;
            // Loop over search term regexes
            for (var k = 0; !matchFound && k < regexps[key].length; k++) {
              splitData[i] = splitData[i].replace(
                regexps[key][k], loopReplaceFn);
            }
          }
          data[key + 'HTML'] = splitData.join(' ');
        } else {
          // If we have no html template injection, simply escape the data
          data[key + 'HTML'] = escapedData;
        }
      }, this);

      // Render contact photo only if specifically stated on the call
      data.photoHTML = renderPhoto ?
        this.tmpl.contactPhoto.interpolate({
          photoURL: details.photoURL || ''
        }) : '';

      // Interpolate HTML template with data and inject.
      // Known "safe" HTML values will not be re-sanitized.
      if (isContact) {
        li.innerHTML = this.tmpl.contact.interpolate(data, {
          safe: ['nameHTML', 'numberHTML', 'srcAttr', 'photoHTML']
        });
        // scan for translatable stuff
        navigator.mozL10n.translate(li);
      } else {
        li.innerHTML = this.tmpl.number.interpolate(data);
      }
      ul.appendChild(li);

      // Revoke contact photo after image onload.
      var photo = li.querySelector('img');
      if (photo) {
        photo.onload = photo.onerror = function revokePhotoURL() {
          this.onload = this.onerror = null;
          URL.revokeObjectURL(this.src);
        };
      }
    }
    return true;
  },

  toFieldKeypress: function(event) {
    if (event.keyCode === 13 || event.keyCode === event.DOM_VK_ENTER) {
      this.container.textContent = '';
    }
  },

  toFieldInput: function(event) {
    var typed;
    if (event.target.isPlaceholder) {
      typed = event.target.textContent.trim();
      this.searchContact(typed);
    }

    this.enableSend();
  },

  searchContact: function thui_searchContact(filterValue) {
    if (!filterValue) {
      // In cases where searchContact was invoked for "input"
      // that was actually a "delete" that removed the last
      // character in the recipient input field,
      // eg. type "a", then delete it.
      // Always remove the the existing results.
      this.container.textContent = '';
      return;
    }

    Contacts.findByString(filterValue, function gotContact(contacts) {
      // If the user has cleared the typed input before the
      // results came back, prevent the results from being rendered
      // by returning immediately.
      if (!this.recipients.inputValue) {
        return;
      }
      // There are contacts that match the input.
      this.container.textContent = '';
      if (!contacts || !contacts.length) {
        return;
      }
      // TODO Modify in Bug 861227 in order to create a standalone element
      var ul = document.createElement('ul');
      ul.classList.add('contact-list');
      ul.addEventListener('click', function ulHandler(event) {
        event.stopPropagation();
        event.preventDefault();
        // Since the "dataset" DOMStringMap property is essentially
        // just an object of properties that exactly match the properties
        // used for recipients, push the whole dataset object into
        // the current recipients list as a new entry.
        this.recipients.add(
          event.target.dataset
        ).focus();

        // Clean up the event listener
        ul.removeEventListener('click', ulHandler);

        event.stopPropagation();
        event.preventDefault();
      }.bind(this));

      this.container.appendChild(ul);

      // Render each contact in the contacts results
      contacts.forEach(function(contact) {
        this.renderContact({
          contact: contact,
          input: filterValue,
          target: ul,
          isContact: true,
          isSuggestion: true
        });
      }, this);
    }.bind(this));
  },

  onHeaderActivation: function thui_onHeaderActivation() {
    var participants = Threads.active && Threads.active.participants;

    // >1 Participants will enter "group view"
    if (participants && participants.length > 1) {
      window.location.href = '#group-view';
      return;
    }

    // Do nothing while in participants list view.
    if (!Threads.active && Threads.lastId) {
      return;
    }

    var number = this.headerText.dataset.number;

    if (this.headerText.dataset.isContact === 'true') {
      this.promptContact({
        number: number
      });
    } else {
      this.prompt({
        number: number,
        isContact: false
      });
    }
  },

  onParticipantClick: function onParticipantClick(event) {
    event.stopPropagation();
    event.preventDefault();

    var target = event.target;

    this.promptContact({
      number: target.dataset.number
    });
  },

  promptContact: function thui_promptContact(opts) {
    opts = opts || {};

    var inMessage = opts.inMessage || false;
    var number = opts.number || '';

    Contacts.findByPhoneNumber(number, function(results) {
      var isContact = results && results.length;
      var contact = isContact ? results[0] : {
        tel: [{ value: number }]
      };
      var ul, id;

      if (isContact) {
        id = contact.id;
        ul = document.createElement('ul');
        ul.classList.add('contact-prompt');

        this.renderContact({
          contact: contact,
          input: number,
          target: ul,
          isContact: isContact,
          isSuggestion: false
        });
      }

      this.prompt({
        number: number,
        contactId: id,
        isContact: isContact,
        inMessage: inMessage,
        body: ul
      });
    }.bind(this));
  },

  groupView: function thui_groupView() {
    var lastId = Threads.lastId;
    var participants = lastId && Threads.get(lastId).participants;
    var ul = this.participantsList;

    this.groupView.reset();

    // Render the Group Participants list
    participants.forEach(function(participant) {

      Contacts.findByPhoneNumber(participant, function(results) {
        var isContact = results !== null && !!results.length;
        var contact = isContact ? results[0] : {
          tel: [{ value: participant }]
        };

        this.renderContact({
          contact: contact,
          input: participant,
          target: ul,
          isContact: isContact,
          isSuggestion: false,
          renderPhoto: true
        });
      }.bind(this));
    }.bind(this));

    // Hide the Messages edit icon, view container and composer form
    this.editIcon.classList.add('hide');
    this.subheader.classList.add('hide');
    this.container.classList.add('hide');
    this.composeForm.classList.add('hide');

    // Append and Show the participants list
    this.participants.appendChild(ul);
    this.participants.classList.remove('hide');

    navigator.mozL10n.localize(this.headerText, 'participant', {
      n: participants.length
    });
  },

  prompt: function thui_prompt(opt) {
    function complete() {
      window.location.href = '#thread=' + Threads.lastId;
    }

    var thread = Threads.get(Threads.lastId || Threads.currentId);
    var number = opt.number || '';
    var email = opt.email || '';
    var isContact = opt.isContact || false;
    var inMessage = opt.inMessage || false;
    var header = '';
    var section = typeof opt.body !== 'undefined' ? opt.body : '';
    var items = [];
    var params, props;

    // Create a params object.
    //  - complete: callback to be invoked when a
    //      button in the menu is pressed
    //  - section: node to display above
    //      the options in the option menu.
    //  - header: string or node to display in the
    //      in the header of the option menu
    //  - items: array of options to display in menu
    //
    params = {
      complete: complete,
      section: section,
      header: '',
      items: null
    };

    // All non-email activations will see a "Call" option
    if (email) {
      header = email;

      items.push({
        l10nId: 'sendEmail',
        method: function oCall(param) {
          ActivityPicker.dial(param);
        },
        params: [email]
      });
    } else {
      header = number;

      items.push({
        l10nId: 'call',
        method: function oCall(param) {
          ActivityPicker.dial(param);
        },
        params: [number]
      });


      // Multi-participant activations or in-message numbers
      // will include a "Send Message" option in the menu
      if ((thread && thread.participants.length > 1) || inMessage) {
        items.push({
          l10nId: 'sendMessage',
          method: function oCall(param) {
            ActivityPicker.sendMessage(param);
          },
          params: [number]
        });
      }
    }

    // Define the initial header, items and section properties
    params.header = header;
    params.items = items;

    if (!isContact) {

      props = [
        number ? {tel: number} : {email: email}
      ];

      // Unknown participants will have options to
      //  - Create A New Contact
      //  - Add To An Existing Contact
      //
      params.items.push({
          l10nId: 'createNewContact',
          method: function oCreate(param) {
            ActivityPicker.createNewContact(
              param, ThreadUI.onCreateContact
            );
          },
          params: props
        },
        {
          l10nId: 'addToExistingContact',
          method: function oAdd(param) {
            ActivityPicker.addToExistingContact(
              param, ThreadUI.onCreateContact
            );
          },
          params: props
        }
      );
    }

    if (opt.contactId) {

        props = [{ id: opt.contactId }];

        params.items.push({
          l10nId: 'viewContact',
          method: function oView(param) {
            ActivityPicker.viewContact(
              param
            );
          },
          params: props
        }
      );
    }

    // All activations will see a "Cancel" option
    params.items.push({
      l10nId: 'cancel',
      incomplete: true
    });

    var options = new OptionMenu(params);
    options.show();
  },

  onCreateContact: function thui_onCreateContact() {
    ThreadListUI.updateContactsInfo();
    // Update Header if needed
    if (window.location.hash.substr(0, 8) === '#thread=') {
      ThreadUI.updateHeaderData();
    }
  }
};

Object.defineProperty(ThreadUI, 'allInputs', {
  get: function() {
    return this.getAllInputs();
  }
});

Object.defineProperty(ThreadUI, 'selectedInputs', {
  get: function() {
    return this.getSelectedInputs();
  }
});

ThreadUI.groupView.reset = function groupViewReset() {
  // Hide the group view
  ThreadUI.participants.classList.add('hide');
  // Remove all LIs
  ThreadUI.participantsList.textContent = '';
  // Restore message list view UI elements
  ThreadUI.editIcon.classList.remove('hide');
  ThreadUI.subheader.classList.remove('hide');
  ThreadUI.container.classList.remove('hide');
  ThreadUI.composeForm.classList.remove('hide');
};

window.confirm = window.confirm; // allow override in unit tests

/**
 * generateHeightRule
 *
 * Generates a new style element, appends to head
 * and inserts a generated rule for applying a class
 * to the recipients list to set its height for
 * multiline mode.
 *
 * @param {Number} height available height (in pixels).
 *
 * @return {Boolean} true if rule was modified, false if not.
 */

function generateHeightRule(height) {
  var css, index, sheet, sheets, style, tmpl;

  if (height === generateHeightRule.prev) {
    return false;
  }

  if (!generateHeightRule.sheet) {
    style = document.createElement('style');
    document.head.appendChild(style);
    sheets = document.styleSheets;
  }

  sheet = generateHeightRule.sheet || sheets[sheets.length - 1];
  index = generateHeightRule.index || sheet.cssRules.length;
  tmpl = generateHeightRule.tmpl || Template('height-rule-tmpl');

  css = tmpl.interpolate({
    height: String(height)
  }, { safe: ['height'] });

  if (generateHeightRule.index) {
    sheet.deleteRule(index);
  }

  sheet.insertRule(css, index);

  generateHeightRule.prev = height;
  generateHeightRule.index = index;
  generateHeightRule.sheet = sheet;
  generateHeightRule.tmpl = tmpl;

  return true;
}

}(this));
